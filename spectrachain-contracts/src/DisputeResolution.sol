// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./LeaseManagement.sol";

/**
 * @title  DisputeResolution
 * @notice Hybrid dispute resolution for the spectrum sharing framework.
 *         Minor disputes are auto-resolved by enforcing agreed lease terms.
 *         Major disputes are escalated on-chain to the NCC regulator.
 */
contract DisputeResolution is Ownable {

    // ── ENUMS ──────────────────────────────────────────────────────────────
    enum DisputeStatus  { Raised, AutoResolved, Escalated, RegulatorResolved }
    enum DisputeType    { PrematureReclaim, QualityViolation, ConditionsViolation, Other }
    enum Resolution     { None, UpheldSecondary, UpheldPrimary, Dismissed }

    // ── STRUCTS ────────────────────────────────────────────────────────────
    struct Dispute {
        uint256       id;
        uint256       leaseId;
        uint256       listingId;
        address       raiser;
        string        raiserName;
        address       against;
        string        againstName;
        DisputeType   disputeType;
        string        evidence;
        DisputeStatus status;
        Resolution    resolution;
        string        resolutionNote;
        uint256       raisedAt;
        uint256       resolvedAt;
    }

    // ── STATE ──────────────────────────────────────────────────────────────
    LeaseManagement public immutable leaseContract;

    uint256 private _counter;

    mapping(uint256 => Dispute) public disputes;
    // leaseId => disputeId (one active dispute per lease)
    mapping(uint256 => uint256) public disputeByLease;

    uint256[] private _ids;

    // ── EVENTS ─────────────────────────────────────────────────────────────
    event DisputeRaised(
        uint256 indexed disputeId,
        uint256 indexed leaseId,
        address indexed raiser,
        DisputeType     disputeType
    );
    event DisputeAutoResolved(
        uint256 indexed disputeId,
        uint256 indexed leaseId,
        Resolution      resolution,
        string          note
    );
    event DisputeEscalated(
        uint256 indexed disputeId,
        uint256 indexed leaseId,
        address indexed raiser
    );
    event DisputeRegulatorResolved(
        uint256 indexed disputeId,
        uint256 indexed leaseId,
        Resolution      resolution,
        string          note
    );

    // ── MODIFIERS ──────────────────────────────────────────────────────────
    modifier disputeExists(uint256 id) {
        require(id > 0 && id <= _counter, "Dispute does not exist");
        _;
    }

    // ── CONSTRUCTOR ────────────────────────────────────────────────────────
    constructor(address leaseContractAddress) Ownable(msg.sender) {
        require(leaseContractAddress != address(0), "Invalid lease contract");
        leaseContract = LeaseManagement(leaseContractAddress);
    }

    // ── RAISE DISPUTE ──────────────────────────────────────────────────────

    /**
     * @notice Raise a dispute against an active lease.
     * @param  leaseId      The lease being disputed
     * @param  disputeType  Category of dispute
     * @param  evidence     Description of the issue and evidence
     */
    function raiseDispute(
        uint256     leaseId,
        DisputeType disputeType,
        string calldata evidence
    ) external returns (uint256) {
        require(bytes(evidence).length > 0, "Evidence cannot be empty");
        require(disputeByLease[leaseId] == 0, "Dispute already exists for this lease");

        // Fetch lease to identify parties
        LeaseManagement.Lease memory lease = leaseContract.getLease(leaseId);

        require(
            msg.sender == lease.secondary || msg.sender == lease.primary,
            "Only lease parties can raise a dispute"
        );
        require(
            lease.status == LeaseManagement.LeaseStatus.Active,
            "Lease is not active"
        );

        // Identify the opposing party
        address against     = (msg.sender == lease.secondary) ? lease.primary   : lease.secondary;
        string memory aName = (msg.sender == lease.secondary) ? lease.primaryName : lease.secondaryName;
        string memory rName = (msg.sender == lease.secondary) ? lease.secondaryName : lease.primaryName;

        _counter++;
        uint256 newId = _counter;

        disputes[newId] = Dispute({
            id:             newId,
            leaseId:        leaseId,
            listingId:      lease.listingId,
            raiser:         msg.sender,
            raiserName:     rName,
            against:        against,
            againstName:    aName,
            disputeType:    disputeType,
            evidence:       evidence,
            status:         DisputeStatus.Raised,
            resolution:     Resolution.None,
            resolutionNote: "",
            raisedAt:       block.timestamp,
            resolvedAt:     0
        });

        disputeByLease[leaseId] = newId;
        _ids.push(newId);

        emit DisputeRaised(newId, leaseId, msg.sender, disputeType);

        // Attempt auto-resolution for minor disputes
        _attemptAutoResolve(newId, lease);

        return newId;
    }

    // ── AUTO RESOLUTION ────────────────────────────────────────────────────

    /**
     * @notice Auto-resolve minor disputes by enforcing agreed lease terms.
     *         PrematureReclaim — primary trying to reclaim before expiry —
     *         is always resolved in favour of the secondary operator.
     *         Other dispute types are escalated for NCC review.
     */
    function _attemptAutoResolve(
        uint256 disputeId,
        LeaseManagement.Lease memory lease
    ) internal {
        Dispute storage d = disputes[disputeId];

        if (d.disputeType == DisputeType.PrematureReclaim) {
            // Enforce the agreed lease terms — secondary keeps access
            d.status         = DisputeStatus.AutoResolved;
            d.resolution     = Resolution.UpheldSecondary;
            d.resolutionNote = "Auto-resolved: primary operator may not reclaim spectrum before scheduled lease expiry. Secondary access upheld per agreed terms.";
            d.resolvedAt     = block.timestamp;

            emit DisputeAutoResolved(
                disputeId,
                lease.id,
                Resolution.UpheldSecondary,
                d.resolutionNote
            );
        } else {
            // All other types require NCC review — escalate
            _escalate(disputeId, lease.id);
        }
    }

    function _escalate(uint256 disputeId, uint256 leaseId) internal {
        Dispute storage d = disputes[disputeId];
        d.status = DisputeStatus.Escalated;

        emit DisputeEscalated(disputeId, leaseId, d.raiser);
    }

    // ── MANUAL ESCALATION ──────────────────────────────────────────────────

    /**
     * @notice Either lease party can manually escalate an auto-resolved
     *         dispute if they disagree with the outcome.
     */
    function escalateToRegulator(uint256 disputeId)
        external disputeExists(disputeId)
    {
        Dispute storage d = disputes[disputeId];

        require(
            msg.sender == d.raiser || msg.sender == d.against,
            "Only lease parties can escalate"
        );
        require(
            d.status == DisputeStatus.Raised ||
            d.status == DisputeStatus.AutoResolved,
            "Cannot escalate at current status"
        );

        d.status = DisputeStatus.Escalated;

        emit DisputeEscalated(disputeId, d.leaseId, msg.sender);
    }

    // ── REGULATOR RESOLUTION ───────────────────────────────────────────────

    /**
     * @notice NCC resolves an escalated dispute.
     *         If UpheldSecondary — lease continues.
     *         If UpheldPrimary   — lease is force-terminated.
     *         If Dismissed       — dispute closed, lease continues.
     */
    function regulatorResolve(
        uint256    disputeId,
        Resolution resolution,
        string calldata note
    ) external onlyOwner disputeExists(disputeId) {
        Dispute storage d = disputes[disputeId];

        require(d.status == DisputeStatus.Escalated, "Dispute not escalated");
        require(resolution != Resolution.None,        "Must provide a resolution");
        require(bytes(note).length > 0,               "Resolution note required");

        d.status         = DisputeStatus.RegulatorResolved;
        d.resolution     = resolution;
        d.resolutionNote = note;
        d.resolvedAt     = block.timestamp;

        emit DisputeRegulatorResolved(disputeId, d.leaseId, resolution, note);

        // If regulator upholds the primary operator, force-terminate the lease
        if (resolution == Resolution.UpheldPrimary) {
            leaseContract.forceTerminate(d.leaseId);
        }
    }

    // ── VIEWS ──────────────────────────────────────────────────────────────

    function getDispute(uint256 id)
        external view disputeExists(id)
        returns (Dispute memory)
    {
        return disputes[id];
    }

    function getDisputeByLease(uint256 leaseId)
        external view returns (Dispute memory)
    {
        uint256 disputeId = disputeByLease[leaseId];
        require(disputeId != 0, "No dispute for this lease");
        return disputes[disputeId];
    }

    function getDisputesByRaiser(address raiser)
        external view returns (Dispute[] memory)
    {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (disputes[_ids[i]].raiser == raiser) count++;
        }

        Dispute[] memory result = new Dispute[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (disputes[_ids[i]].raiser == raiser) {
                result[idx++] = disputes[_ids[i]];
            }
        }
        return result;
    }

    function getEscalatedDisputes() external view returns (Dispute[] memory) {
        uint256 count;
        for (uint256 i; i < _ids.length; i++) {
            if (disputes[_ids[i]].status == DisputeStatus.Escalated) count++;
        }

        Dispute[] memory result = new Dispute[](count);
        uint256 idx;
        for (uint256 i; i < _ids.length; i++) {
            if (disputes[_ids[i]].status == DisputeStatus.Escalated) {
                result[idx++] = disputes[_ids[i]];
            }
        }
        return result;
    }

    function getTotalDisputes() external view returns (uint256) {
        return _counter;
    }
}