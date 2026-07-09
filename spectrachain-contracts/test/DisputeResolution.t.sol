// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SpectrumListing.sol";
import "../src/AccessRequest.sol";
import "../src/LeaseManagement.sol";
import "../src/DisputeResolution.sol";

contract DisputeResolutionTest is Test {

    SpectrumListing   public sl;
    AccessRequest     public ar;
    LeaseManagement   public lm;
    DisputeResolution public dr;

    address ncc    = makeAddr("ncc");
    address mtn    = makeAddr("mtn");
    address airtel = makeAddr("airtel");
    address random = makeAddr("random");

    uint256 listingStart;
    uint256 listingEnd;
    uint256 listingId;
    uint256 requestId;
    uint256 leaseId;

    function setUp() public {
        vm.startPrank(ncc);
        sl = new SpectrumListing();
        ar = new AccessRequest(address(sl));
        lm = new LeaseManagement(address(sl), address(ar));
        dr = new DisputeResolution(address(lm));

        ar.authoriseContract(address(lm));
        lm.authoriseContract(address(dr));

        sl.registerOperator(mtn,     "MTN Nigeria");
        ar.registerSecondary(airtel, "Airtel Nigeria");
        vm.stopPrank();

        listingStart = block.timestamp + 1 days;
        listingEnd   = block.timestamp + 30 days;

        vm.prank(mtn);
        listingId = sl.createListing(
            "700 MHz", "Lagos",
            listingStart, listingEnd,
            "Max EIRP 43 dBm"
        );

        vm.prank(airtel);
        requestId = ar.submitRequest(
            listingId,
            listingStart + 1 hours,
            listingStart + 10 days,
            "Capacity expansion"
        );

        vm.prank(ncc);
        leaseId = lm.createLease(requestId);

        vm.warp(listingStart + 2 hours);
    }

    // ── RAISE DISPUTE ──────────────────────────────────────────────────────

    function test_RaiseDispute() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "Primary attempted to reclaim spectrum before expiry."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(d.leaseId,  leaseId);
        assertEq(d.raiser,   airtel);
        assertEq(d.against,  mtn);
        assertEq(uint(d.disputeType), uint(DisputeResolution.DisputeType.PrematureReclaim));
    }

    function test_OnlyLeasePartiesCanRaise() public {
        vm.prank(random);
        vm.expectRevert("Only lease parties can raise a dispute");
        dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.Other,
            "Evidence"
        );
    }

    function test_CannotRaiseWithEmptyEvidence() public {
        vm.prank(airtel);
        vm.expectRevert("Evidence cannot be empty");
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.Other, "");
    }

    function test_CannotRaiseDuplicateDispute() public {
        vm.prank(airtel);
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.Other, "First dispute");

        vm.prank(airtel);
        vm.expectRevert("Dispute already exists for this lease");
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.Other, "Second dispute");
    }

    function test_CannotRaiseOnExpiredLease() public {
        AccessRequest.Request memory req = ar.getRequest(requestId);
        vm.warp(req.requestedEnd + 1);
        lm.checkAndExpire(leaseId);

        vm.prank(airtel);
        vm.expectRevert("Lease is not active");
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.Other, "Evidence");
    }

    // ── AUTO RESOLUTION ────────────────────────────────────────────────────

    function test_PrematureReclaimAutoResolved() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "MTN tried to reclaim before expiry."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.status),     uint(DisputeResolution.DisputeStatus.AutoResolved));
        assertEq(uint(d.resolution), uint(DisputeResolution.Resolution.UpheldSecondary));
        assertTrue(d.resolvedAt > 0);
    }

    function test_AutoResolvedLeavesLeaseActive() public {
        vm.prank(airtel);
        dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "MTN tried to reclaim before expiry."
        );

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Active));
    }

    function test_OtherTypesEscalated() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.QualityViolation,
            "Signal quality degraded below agreed threshold."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.status), uint(DisputeResolution.DisputeStatus.Escalated));
    }

    function test_ConditionsViolationEscalated() public {
        vm.prank(mtn);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.ConditionsViolation,
            "Secondary exceeded agreed EIRP limit."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.status), uint(DisputeResolution.DisputeStatus.Escalated));
    }

    // ── MANUAL ESCALATION ──────────────────────────────────────────────────

    function test_ManualEscalation() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "Evidence."
        );

        vm.prank(airtel);
        dr.escalateToRegulator(disputeId);

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.status), uint(DisputeResolution.DisputeStatus.Escalated));
    }

    function test_OnlyPartiesCanEscalate() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "Evidence."
        );

        vm.prank(random);
        vm.expectRevert("Only lease parties can escalate");
        dr.escalateToRegulator(disputeId);
    }

    // ── REGULATOR RESOLUTION ───────────────────────────────────────────────

    function test_RegulatorUpholdSecondary() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.QualityViolation,
            "Evidence."
        );

        vm.prank(ncc);
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.UpheldSecondary,
            "NCC reviewed evidence. Secondary operator claims upheld. Lease continues."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.status),     uint(DisputeResolution.DisputeStatus.RegulatorResolved));
        assertEq(uint(d.resolution), uint(DisputeResolution.Resolution.UpheldSecondary));

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Active));
    }

    function test_RegulatorUpholdPrimaryTerminatesLease() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.ConditionsViolation,
            "Evidence."
        );

        vm.prank(ncc);
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.UpheldPrimary,
            "NCC reviewed evidence. Secondary operator violated conditions. Lease terminated."
        );

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Released));
    }

    function test_RegulatorDismiss() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.Other,
            "Evidence."
        );

        vm.prank(ncc);
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.Dismissed,
            "Dispute dismissed. Insufficient evidence provided."
        );

        DisputeResolution.Dispute memory d = dr.getDispute(disputeId);
        assertEq(uint(d.resolution), uint(DisputeResolution.Resolution.Dismissed));

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Active));
    }

    function test_OnlyOwnerCanRegulatorResolve() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.QualityViolation,
            "Evidence."
        );

        vm.prank(mtn);
        vm.expectRevert();
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.UpheldSecondary,
            "Note"
        );
    }

    function test_CannotResolveNonEscalated() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.PrematureReclaim,
            "Evidence."
        );

        vm.prank(ncc);
        vm.expectRevert("Dispute not escalated");
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.UpheldSecondary,
            "Note"
        );
    }

    function test_ResolutionNoteRequired() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.QualityViolation,
            "Evidence."
        );

        vm.prank(ncc);
        vm.expectRevert("Resolution note required");
        dr.regulatorResolve(
            disputeId,
            DisputeResolution.Resolution.UpheldSecondary,
            ""
        );
    }

    // ── QUERIES ────────────────────────────────────────────────────────────

    function test_GetDisputeByLease() public {
        vm.prank(airtel);
        uint256 disputeId = dr.raiseDispute(
            leaseId,
            DisputeResolution.DisputeType.Other,
            "Evidence."
        );

        DisputeResolution.Dispute memory d = dr.getDisputeByLease(leaseId);
        assertEq(d.id, disputeId);
    }

    function test_GetDisputeByLeaseRevertsIfNone() public {
        vm.expectRevert("No dispute for this lease");
        dr.getDisputeByLease(leaseId);
    }

    function test_GetDisputesByRaiser() public {
        vm.prank(airtel);
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.Other, "Evidence.");

        DisputeResolution.Dispute[] memory raised = dr.getDisputesByRaiser(airtel);
        assertEq(raised.length,    1);
        assertEq(raised[0].raiser, airtel);
    }

    function test_GetEscalatedDisputes() public {
        vm.prank(airtel);
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.QualityViolation, "Evidence.");

        DisputeResolution.Dispute[] memory escalated = dr.getEscalatedDisputes();
        assertEq(escalated.length, 1);
        assertEq(uint(escalated[0].status), uint(DisputeResolution.DisputeStatus.Escalated));
    }

    // ── EVENTS ────────────────────────────────────────────────────────────

    function test_EmitsDisputeRaised() public {
        vm.prank(airtel);
        vm.expectEmit(true, true, true, true);
        emit DisputeResolution.DisputeRaised(
            1, leaseId, airtel,
            DisputeResolution.DisputeType.PrematureReclaim
        );
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.PrematureReclaim, "Evidence.");
    }

    function test_EmitsDisputeEscalated() public {
        vm.prank(airtel);
        vm.expectEmit(true, true, true, false);
        emit DisputeResolution.DisputeEscalated(1, leaseId, airtel);
        dr.raiseDispute(leaseId, DisputeResolution.DisputeType.QualityViolation, "Evidence.");
    }
}