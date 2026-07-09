// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumListing.sol";

/**
 * @title  AccessRequest
 * @notice Secondary operators submit spectrum access requests.
 *         The contract validates all conditions automatically and
 *         either grants a lease or rejects with a reason on-chain.
 */
contract AccessRequest is Ownable {

    // ── ENUMS ──────────────────────────────────────────────────────────────
    enum RequestStatus { Pending, Granted, Rejected }

    // ── STRUCTS ────────────────────────────────────────────────────────────
    struct Request {
        uint256       id;
        address       requester;
        string        requesterName;
        uint256       listingId;
        uint256       requestedStart;
        uint256       requestedEnd;
        string        purpose;
        RequestStatus status;
        string        rejectionReason;
        uint256       createdAt;
    }

    // ── STATE ──────────────────────────────────────────────────────────────
    SpectrumListing public immutable listingContract;

    uint256 private _counter;

    mapping(uint256 => Request) public requests;
    mapping(address => bool)    public registeredSecondary;
    mapping(address => string)  public secondaryNames;
    mapping(address => bool)    public authorisedContracts;

    // listingId => requestId that holds the active grant
    mapping(uint256 => uint256) public activeGrantForListing;

    uint256[] private _ids;

    // ── EVENTS ─────────────────────────────────────────────────────────────
    event SecondaryRegistered(address indexed operator, string name);
    event SecondaryRemoved(address indexed operator);
    event ContractAuthorised(address indexed contractAddress);
    event RequestSubmitted(
        uint256 indexed requestId,
        address indexed requester,
        uint256 indexed listingId,
        uint256 requestedStart,
        uint256 requestedEnd
    );
    event LeaseGranted(
        uint256 indexed requestId,
        uint256 indexed listingId,
        address indexed requester,
        uint256 grantedStart,
        uint256 grantedEnd
    );
    event RequestRejected(
        uint256 indexed requestId,
        uint256 indexed listingId,
        address indexed requester,
        string  reason
    );

    // ── MODIFIERS ──────────────────────────────────────────────────────────
    modifier onlySecondary() {
        require(registeredSecondary[msg.sender], "Not a registered secondary operator");
        _;
    }

    modifier requestExists(uint256 id) {
        require(id > 0 && id <= _counter, "Request does not exist");
        _;
    }

    // ── CONSTRUCTOR ────────────────────────────────────────────────────────
    constructor(address listingContractAddress) Ownable(msg.sender) {
        require(listingContractAddress != address(0), "Invalid listing contract");
        listingContract = SpectrumListing(listingContractAddress);
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────

    function registerSecondary(address operator, string calldata name)
        external onlyOwner
    {
        require(operator != address(0),         "Invalid address");
        require(bytes(name).length > 0,         "Name cannot be empty");
        require(!registeredSecondary[operator],  "Already registered");

        registeredSecondary[operator] = true;
        secondaryNames[operator]      = name;

        emit SecondaryRegistered(operator, name);
    }

    function removeSecondary(address operator) external onlyOwner {
        require(registeredSecondary[operator], "Not registered");
        registeredSecondary[operator] = false;
        emit SecondaryRemoved(operator);
    }

    /**
     * @notice Authorise another contract to call clearActiveGrant.
     *         Used to allow LeaseManagement to clear grants on expiry
     *         or release without requiring owner to call directly.
     */
    function authoriseContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorisedContracts[contractAddress] = true;
        emit ContractAuthorised(contractAddress);
    }

    // ── SECONDARY OPERATOR ─────────────────────────────────────────────────

    /**
     * @notice Submit a spectrum access request for a listing.
     * @param  listingId       The listing to request access to
     * @param  requestedStart  Unix timestamp for desired start
     * @param  requestedEnd    Unix timestamp for desired end
     * @param  purpose         Purpose of use string
     * @return requestId       The new request ID
     */
    function submitRequest(
        uint256 listingId,
        uint256 requestedStart,
        uint256 requestedEnd,
        string  calldata purpose
    ) external onlySecondary returns (uint256) {
        require(requestedStart > block.timestamp, "Start must be in future");
        require(requestedEnd   > requestedStart,  "End must be after start");
        require(bytes(purpose).length > 0,        "Purpose cannot be empty");

        _counter++;
        uint256 newId = _counter;

        requests[newId] = Request({
            id:              newId,
            requester:       msg.sender,
            requesterName:   secondaryNames[msg.sender],
            listingId:       listingId,
            requestedStart:  requestedStart,
            requestedEnd:    requestedEnd,
            purpose:         purpose,
            status:          RequestStatus.Pending,
            rejectionReason: "",
            createdAt:       block.timestamp
        });

        _ids.push(newId);

        emit RequestSubmitted(newId, msg.sender, listingId, requestedStart, requestedEnd);

        // Validate immediately on submission
        _validate(newId);

        return newId;
    }

    // ── INTERNAL VALIDATION ────────────────────────────────────────────────

    function _validate(uint256 requestId) internal {
        Request storage req = requests[requestId];

        // Check 1 — listing exists and is active
        bool   listingActive;
        uint256 listingStart;
        uint256 listingEnd;

        try listingContract.getListing(req.listingId) returns (
            SpectrumListing.Listing memory l
        ) {
            listingActive = (l.status == SpectrumListing.ListingStatus.Active);
            listingStart  = l.startTime;
            listingEnd    = l.endTime;
        } catch {
            _reject(requestId, "Listing does not exist");
            return;
        }

        if (!listingActive) {
            _reject(requestId, "Listing is not active");
            return;
        }

        // Check 2 — requested window fits inside listing window
        if (req.requestedStart < listingStart) {
            _reject(requestId, "Requested start is before listing window");
            return;
        }
        if (req.requestedEnd > listingEnd) {
            _reject(requestId, "Requested end exceeds listing window");
            return;
        }

        // Check 3 — no conflicting active grant for this listing
        uint256 existingGrantId = activeGrantForListing[req.listingId];
        if (existingGrantId != 0) {
            Request memory existing = requests[existingGrantId];
            bool overlap = (
                req.requestedStart < existing.requestedEnd &&
                req.requestedEnd   > existing.requestedStart
            );
            if (overlap) {
                _reject(requestId, "Conflicting active lease exists for this listing");
                return;
            }
        }

        // All checks passed — grant
        _grant(requestId);
    }

    function _grant(uint256 requestId) internal {
        Request storage req = requests[requestId];
        req.status = RequestStatus.Granted;
        activeGrantForListing[req.listingId] = requestId;

        emit LeaseGranted(
            requestId,
            req.listingId,
            req.requester,
            req.requestedStart,
            req.requestedEnd
        );
    }

    function _reject(uint256 requestId, string memory reason) internal {
        Request storage req  = requests[requestId];
        req.status           = RequestStatus.Rejected;
        req.rejectionReason  = reason;

        emit RequestRejected(requestId, req.listingId, req.requester, reason);
    }

    // ── GRANT MANAGEMENT ───────────────────────────────────────────────────

    /**
     * @notice Clear the active grant for a listing.
     *         Called by LeaseManagement on lease expiry or release,
     *         restoring the listing to available status.
     */
    function clearActiveGrant(uint256 listingId) external {
        require(
            msg.sender == owner()              ||
            registeredSecondary[msg.sender]    ||
            authorisedContracts[msg.sender],
            "Not authorised"
        );
        delete activeGrantForListing[listingId];
    }

    // ── VIEWS ──────────────────────────────────────────────────────────────

    function getRequest(uint256 id)
        external view requestExists(id)
        returns (Request memory)
    {
        return requests[id];
    }

    function getRequestsByRequester(address requester)
        external view returns (Request[] memory)
    {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (requests[_ids[i]].requester == requester) count++;
        }

        Request[] memory result = new Request[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (requests[_ids[i]].requester == requester) {
                result[idx++] = requests[_ids[i]];
            }
        }
        return result;
    }

    function getActiveGrant(uint256 listingId)
        external view returns (Request memory)
    {
        uint256 grantId = activeGrantForListing[listingId];
        require(grantId != 0, "No active grant for this listing");
        return requests[grantId];
    }

    function getTotalRequests() external view returns (uint256) {
        return _counter;
    }
}