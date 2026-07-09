// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./SpectrumListing.sol";
import "./AccessRequest.sol";

/**
 * @title  LeaseManagement
 * @notice Tracks active leases from grant to expiry.
 *         Handles voluntary early release and automatic expiry checks.
 *         On termination, restores listing availability via AccessRequest.
 */
contract LeaseManagement is Ownable {

    // ── ENUMS ──────────────────────────────────────────────────────────────
    enum LeaseStatus { Active, Expired, Released }

    // ── STRUCTS ────────────────────────────────────────────────────────────
    struct Lease {
        uint256     id;
        uint256     requestId;
        uint256     listingId;
        address     primary;
        string      primaryName;
        address     secondary;
        string      secondaryName;
        string      band;
        string      area;
        uint256     startTime;
        uint256     endTime;
        LeaseStatus status;
        uint256     createdAt;
        uint256     terminatedAt;
    }

    // ── STATE ──────────────────────────────────────────────────────────────
    SpectrumListing public immutable listingContract;
    AccessRequest   public immutable requestContract;

    uint256 private _counter;

    mapping(uint256 => Lease)   public leases;
    mapping(uint256 => uint256) public leaseByRequest;
    mapping(uint256 => uint256) public activeLeaseForListing;
    mapping(address => bool)    public authorisedContracts;

    uint256[] private _ids;

    // ── EVENTS ─────────────────────────────────────────────────────────────
    event LeaseCreated(
        uint256 indexed leaseId,
        uint256 indexed listingId,
        uint256 indexed requestId,
        address primary,
        address secondary,
        uint256 startTime,
        uint256 endTime
    );
    event LeaseExpired(
        uint256 indexed leaseId,
        uint256 indexed listingId,
        address secondary
    );
    event LeaseReleased(
        uint256 indexed leaseId,
        uint256 indexed listingId,
        address secondary,
        uint256 releasedAt
    );

    // ── MODIFIERS ──────────────────────────────────────────────────────────
    modifier leaseExists(uint256 id) {
        require(id > 0 && id <= _counter, "Lease does not exist");
        _;
    }

    // ── CONSTRUCTOR ────────────────────────────────────────────────────────
    constructor(
        address listingContractAddress,
        address requestContractAddress
    ) Ownable(msg.sender) {
        require(listingContractAddress != address(0), "Invalid listing contract");
        require(requestContractAddress != address(0), "Invalid request contract");

        listingContract = SpectrumListing(listingContractAddress);
        requestContract = AccessRequest(requestContractAddress);
    }

    // ── ADMIN ──────────────────────────────────────────────────────────────

    /**
     * @notice Authorise another contract to call forceTerminate.
     *         Used to allow DisputeResolution to terminate leases
     *         after a regulator decision without requiring owner call.
     */
    function authoriseContract(address contractAddress) external onlyOwner {
        require(contractAddress != address(0), "Invalid address");
        authorisedContracts[contractAddress] = true;
    }

    // ── LEASE CREATION ─────────────────────────────────────────────────────

    /**
     * @notice Create a lease record from a granted access request.
     *         Called by the owner (NCC / backend) after LeaseGranted event.
     * @param  requestId  The granted AccessRequest ID
     */
    function createLease(uint256 requestId) external onlyOwner returns (uint256) {
        require(leaseByRequest[requestId] == 0, "Lease already exists for this request");

        AccessRequest.Request memory req = requestContract.getRequest(requestId);
        require(
            req.status == AccessRequest.RequestStatus.Granted,
            "Request is not granted"
        );

        SpectrumListing.Listing memory listing = listingContract.getListing(req.listingId);

        _counter++;
        uint256 newId = _counter;

        leases[newId] = Lease({
            id:            newId,
            requestId:     requestId,
            listingId:     req.listingId,
            primary:       listing.owner,
            primaryName:   listing.operatorName,
            secondary:     req.requester,
            secondaryName: req.requesterName,
            band:          listing.band,
            area:          listing.area,
            startTime:     req.requestedStart,
            endTime:       req.requestedEnd,
            status:        LeaseStatus.Active,
            createdAt:     block.timestamp,
            terminatedAt:  0
        });

        leaseByRequest[requestId]            = newId;
        activeLeaseForListing[req.listingId] = newId;
        _ids.push(newId);

        emit LeaseCreated(
            newId,
            req.listingId,
            requestId,
            listing.owner,
            req.requester,
            req.requestedStart,
            req.requestedEnd
        );

        return newId;
    }

    // ── LEASE TERMINATION ──────────────────────────────────────────────────

    /**
     * @notice Check and expire a lease that has passed its end time.
     *         Permissionless — anyone may call to trigger expiry.
     */
    function checkAndExpire(uint256 leaseId) external leaseExists(leaseId) {
        Lease storage l = leases[leaseId];
        require(l.status == LeaseStatus.Active, "Lease not active");
        require(block.timestamp >= l.endTime,   "Lease has not expired yet");

        l.status       = LeaseStatus.Expired;
        l.terminatedAt = block.timestamp;

        _clearGrant(l.listingId);

        emit LeaseExpired(leaseId, l.listingId, l.secondary);
    }

    /**
     * @notice Secondary operator voluntarily releases spectrum early.
     */
    function releaseLease(uint256 leaseId) external leaseExists(leaseId) {
        Lease storage l = leases[leaseId];
        require(l.secondary == msg.sender,      "Only the secondary operator can release");
        require(l.status == LeaseStatus.Active, "Lease not active");

        l.status       = LeaseStatus.Released;
        l.terminatedAt = block.timestamp;

        _clearGrant(l.listingId);

        emit LeaseReleased(leaseId, l.listingId, l.secondary, block.timestamp);
    }

    /**
     * @notice Force-terminate a lease.
     *         Callable by owner (NCC) or an authorised contract
     *         such as DisputeResolution after a regulator decision.
     */
    function forceTerminate(uint256 leaseId) external leaseExists(leaseId) {
        require(
            msg.sender == owner() || authorisedContracts[msg.sender],
            "Not authorised"
        );
        Lease storage l = leases[leaseId];
        require(l.status == LeaseStatus.Active, "Lease not active");

        l.status       = LeaseStatus.Released;
        l.terminatedAt = block.timestamp;

        _clearGrant(l.listingId);

        emit LeaseReleased(leaseId, l.listingId, l.secondary, block.timestamp);
    }

    // ── INTERNAL ───────────────────────────────────────────────────────────

    function _clearGrant(uint256 listingId) internal {
        activeLeaseForListing[listingId] = 0;
        requestContract.clearActiveGrant(listingId);
    }

    // ── VIEWS ──────────────────────────────────────────────────────────────

    function getLease(uint256 id)
        external view leaseExists(id)
        returns (Lease memory)
    {
        return leases[id];
    }

    function getActiveLease(uint256 listingId)
        external view returns (Lease memory)
    {
        uint256 leaseId = activeLeaseForListing[listingId];
        require(leaseId != 0, "No active lease for this listing");
        return leases[leaseId];
    }

    function getLeasesBySecondary(address secondary)
        external view returns (Lease[] memory)
    {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].secondary == secondary) count++;
        }
        Lease[] memory result = new Lease[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].secondary == secondary) {
                result[idx++] = leases[_ids[i]];
            }
        }
        return result;
    }

    function getLeasesByPrimary(address primary)
        external view returns (Lease[] memory)
    {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].primary == primary) count++;
        }
        Lease[] memory result = new Lease[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].primary == primary) {
                result[idx++] = leases[_ids[i]];
            }
        }
        return result;
    }

    function isLeaseActive(uint256 leaseId)
        external view leaseExists(leaseId)
        returns (bool)
    {
        Lease memory l = leases[leaseId];
        return (
            l.status == LeaseStatus.Active &&
            block.timestamp >= l.startTime &&
            block.timestamp <  l.endTime
        );
    }

    function getAllActiveLeases() external view returns (Lease[] memory) {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].status == LeaseStatus.Active) count++;
        }
        Lease[] memory result = new Lease[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (leases[_ids[i]].status == LeaseStatus.Active) {
                result[idx++] = leases[_ids[i]];
            }
        }
        return result;
    }

    function getTotalLeases() external view returns (uint256) {
        return _counter;
    }
}