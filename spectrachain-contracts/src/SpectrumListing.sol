// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  SpectrumListing
 * @notice Primary operators register idle spectrum on-chain.
 *         Only NCC-registered operators may create listings.
 */
contract SpectrumListing is Ownable {

    // ── ENUMS ──────────────────────────────────────────────────────────────
    enum ListingStatus { Active, Expired, Deactivated }

    // ── STRUCTS ────────────────────────────────────────────────────────────
    struct Listing {
        uint256       id;
        address       owner;
        string        operatorName;
        string        band;
        string        area;
        uint256       startTime;
        uint256       endTime;
        string        conditions;
        ListingStatus status;
        uint256       createdAt;
    }

    // ── STATE ──────────────────────────────────────────────────────────────
    uint256 private _counter;

    mapping(uint256 => Listing) public listings;
    mapping(address => bool)    public registeredOperators;
    mapping(address => string)  public operatorNames;

    uint256[] private _ids;

    // ── EVENTS ─────────────────────────────────────────────────────────────
    event OperatorRegistered(address indexed operator, string name);
    event OperatorRemoved(address indexed operator);
    event ListingCreated(
        uint256 indexed listingId,
        address indexed owner,
        string  band,
        string  area,
        uint256 startTime,
        uint256 endTime
    );
    event ListingDeactivated(uint256 indexed listingId, address indexed owner);
    event ListingExpired(uint256 indexed listingId);

    // ── MODIFIERS ──────────────────────────────────────────────────────────
    modifier onlyRegistered() {
        require(registeredOperators[msg.sender], "Not a registered NCC operator");
        _;
    }

    modifier exists(uint256 id) {
        require(id > 0 && id <= _counter, "Listing does not exist");
        _;
    }

    // ── CONSTRUCTOR ────────────────────────────────────────────────────────
    constructor() Ownable(msg.sender) {}

    // ── ADMIN ──────────────────────────────────────────────────────────────

    function registerOperator(address operator, string calldata name)
        external onlyOwner
    {
        require(operator != address(0),        "Invalid address");
        require(bytes(name).length > 0,        "Name cannot be empty");
        require(!registeredOperators[operator], "Already registered");

        registeredOperators[operator] = true;
        operatorNames[operator]       = name;

        emit OperatorRegistered(operator, name);
    }

    function removeOperator(address operator) external onlyOwner {
        require(registeredOperators[operator], "Not registered");
        registeredOperators[operator] = false;
        emit OperatorRemoved(operator);
    }

    // ── OPERATOR ───────────────────────────────────────────────────────────

    /**
     * @notice List idle spectrum on the blockchain.
     * @param  band       Frequency band e.g. "700 MHz"
     * @param  area       Nigerian state e.g. "Lagos"
     * @param  startTime  Unix timestamp — must be in the future
     * @param  endTime    Unix timestamp — must be after startTime
     * @param  conditions Access conditions string
     * @return id         The new listing ID
     */
    function createListing(
        string  calldata band,
        string  calldata area,
        uint256          startTime,
        uint256          endTime,
        string  calldata conditions
    ) external onlyRegistered returns (uint256) {
        require(bytes(band).length > 0,      "Band cannot be empty");
        require(bytes(area).length > 0,      "Area cannot be empty");
        require(startTime > block.timestamp, "Start must be in future");
        require(endTime   > startTime,       "End must be after start");
        require(bytes(conditions).length > 0,"Conditions cannot be empty");

        _counter++;
        uint256 newId = _counter;

        listings[newId] = Listing({
            id:           newId,
            owner:        msg.sender,
            operatorName: operatorNames[msg.sender],
            band:         band,
            area:         area,
            startTime:    startTime,
            endTime:      endTime,
            conditions:   conditions,
            status:       ListingStatus.Active,
            createdAt:    block.timestamp
        });

        _ids.push(newId);

        emit ListingCreated(newId, msg.sender, band, area, startTime, endTime);

        return newId;
    }

    function deactivateListing(uint256 id) external exists(id) {
        Listing storage l = listings[id];
        require(l.owner == msg.sender,              "Not listing owner");
        require(l.status == ListingStatus.Active,   "Listing not active");

        l.status = ListingStatus.Deactivated;
        emit ListingDeactivated(id, msg.sender);
    }

    function expireListing(uint256 id) external exists(id) {
        Listing storage l = listings[id];
        require(
            l.owner == msg.sender || msg.sender == owner(),
            "Not authorised"
        );
        require(l.status == ListingStatus.Active, "Not active");
        require(block.timestamp >= l.endTime,     "Window not ended");

        l.status = ListingStatus.Expired;
        emit ListingExpired(id);
    }

    // ── VIEWS ──────────────────────────────────────────────────────────────

    function getListing(uint256 id)
        external view exists(id)
        returns (Listing memory)
    {
        return listings[id];
    }

    function getActiveListings() external view returns (Listing[] memory) {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (listings[_ids[i]].status == ListingStatus.Active) count++;
        }

        Listing[] memory result = new Listing[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (listings[_ids[i]].status == ListingStatus.Active) {
                result[idx++] = listings[_ids[i]];
            }
        }
        return result;
    }

    function getListingsByOperator(address operator)
        external view returns (Listing[] memory)
    {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (listings[_ids[i]].owner == operator) count++;
        }

        Listing[] memory result = new Listing[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (listings[_ids[i]].owner == operator) {
                result[idx++] = listings[_ids[i]];
            }
        }
        return result;
    }

    function isAvailable(uint256 id)
        external view exists(id)
        returns (bool)
    {
        Listing memory l = listings[id];
        return (
            l.status == ListingStatus.Active &&
            block.timestamp >= l.startTime   &&
            block.timestamp <  l.endTime
        );
    }

    function getTotalListings() external view returns (uint256) {
        return _counter;
    }
}