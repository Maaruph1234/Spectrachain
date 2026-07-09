// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SpectrumListing.sol";
import "../src/AccessRequest.sol";
import "../src/LeaseManagement.sol";

contract LeaseManagementTest is Test {

    SpectrumListing public sl;
    AccessRequest   public ar;
    LeaseManagement public lm;

    address ncc    = makeAddr("ncc");
    address mtn    = makeAddr("mtn");
    address airtel = makeAddr("airtel");
    address glo    = makeAddr("glo");

    uint256 listingStart;
    uint256 listingEnd;
    uint256 listingId;
    uint256 requestId;

    function setUp() public {
        vm.startPrank(ncc);
        sl = new SpectrumListing();
        ar = new AccessRequest(address(sl));
        lm = new LeaseManagement(address(sl), address(ar));

        ar.authoriseContract(address(lm));

        sl.registerOperator(mtn,  "MTN Nigeria");
        sl.registerOperator(glo,  "Glo Mobile");
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
    }

    // ── LEASE CREATION ─────────────────────────────────────────────────────

    function test_CreateLease() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(l.id,        leaseId);
        assertEq(l.listingId, listingId);
        assertEq(l.requestId, requestId);
        assertEq(l.primary,   mtn);
        assertEq(l.secondary, airtel);
        assertEq(l.band,      "700 MHz");
        assertEq(l.area,      "Lagos");
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Active));
    }

    function test_OnlyOwnerCanCreateLease() public {
        vm.prank(mtn);
        vm.expectRevert();
        lm.createLease(requestId);
    }

    function test_CannotCreateDuplicateLease() public {
        vm.prank(ncc);
        lm.createLease(requestId);

        vm.prank(ncc);
        vm.expectRevert("Lease already exists for this request");
        lm.createLease(requestId);
    }

    function test_CannotLeaseUngrantedRequest() public {
        vm.prank(mtn);
        uint256 newListingId = sl.createListing(
            "1800 MHz", "Abuja",
            block.timestamp + 2 days,
            block.timestamp + 20 days,
            "Conditions"
        );
        vm.prank(mtn);
        sl.deactivateListing(newListingId);

        vm.prank(airtel);
        uint256 rejectedReqId = ar.submitRequest(
            newListingId,
            block.timestamp + 2 days + 1,
            block.timestamp + 10 days,
            "Purpose"
        );

        vm.prank(ncc);
        vm.expectRevert("Request is not granted");
        lm.createLease(rejectedReqId);
    }

    // ── EXPIRY ─────────────────────────────────────────────────────────────

    function test_CheckAndExpire() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        AccessRequest.Request memory req = ar.getRequest(requestId);
        vm.warp(req.requestedEnd + 1);

        lm.checkAndExpire(leaseId);

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Expired));
        assertTrue(l.terminatedAt > 0);
    }

    function test_CannotExpireBeforeEndTime() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.expectRevert("Lease has not expired yet");
        lm.checkAndExpire(leaseId);
    }

    function test_CannotExpireAlreadyExpired() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        AccessRequest.Request memory req = ar.getRequest(requestId);
        vm.warp(req.requestedEnd + 1);

        lm.checkAndExpire(leaseId);

        vm.expectRevert("Lease not active");
        lm.checkAndExpire(leaseId);
    }

    function test_ExpiryRestoresListingAvailability() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        AccessRequest.Request memory req = ar.getRequest(requestId);
        vm.warp(req.requestedEnd + 1);
        lm.checkAndExpire(leaseId);

        vm.expectRevert("No active grant for this listing");
        ar.getActiveGrant(listingId);

        vm.expectRevert("No active lease for this listing");
        lm.getActiveLease(listingId);
    }

    // ── EARLY RELEASE ──────────────────────────────────────────────────────

    function test_EarlyRelease() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.warp(listingStart + 2 hours);

        vm.prank(airtel);
        lm.releaseLease(leaseId);

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Released));
        assertTrue(l.terminatedAt > 0);
    }

    function test_OnlySecondaryCanRelease() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.warp(listingStart + 1 hours);

        vm.prank(mtn);
        vm.expectRevert("Only the secondary operator can release");
        lm.releaseLease(leaseId);
    }

    function test_ReleaseRestoresAvailability() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.warp(listingStart + 2 hours);

        vm.prank(airtel);
        lm.releaseLease(leaseId);

        vm.expectRevert("No active grant for this listing");
        ar.getActiveGrant(listingId);
    }

    // ── FORCE TERMINATE ────────────────────────────────────────────────────

    function test_ForceTerminate() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.prank(ncc);
        lm.forceTerminate(leaseId);

        LeaseManagement.Lease memory l = lm.getLease(leaseId);
        assertEq(uint(l.status), uint(LeaseManagement.LeaseStatus.Released));
    }

    function test_OnlyOwnerCanForceTerminate() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.prank(airtel);
        vm.expectRevert("Not authorised");
        lm.forceTerminate(leaseId);
    }

    // ── QUERIES ────────────────────────────────────────────────────────────

    function test_GetActiveLease() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        LeaseManagement.Lease memory l = lm.getActiveLease(listingId);
        assertEq(l.id, leaseId);
    }

    function test_GetActiveLeaseRevertsIfNone() public {
        vm.expectRevert("No active lease for this listing");
        lm.getActiveLease(listingId);
    }

    function test_GetLeasesBySecondary() public {
        vm.prank(ncc);
        lm.createLease(requestId);

        LeaseManagement.Lease[] memory secondaryLeases = lm.getLeasesBySecondary(airtel);
        assertEq(secondaryLeases.length,       1);
        assertEq(secondaryLeases[0].secondary, airtel);
    }

    function test_GetLeasesByPrimary() public {
        vm.prank(ncc);
        lm.createLease(requestId);

        LeaseManagement.Lease[] memory primaryLeases = lm.getLeasesByPrimary(mtn);
        assertEq(primaryLeases.length,     1);
        assertEq(primaryLeases[0].primary, mtn);
    }

    function test_IsLeaseActive() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        assertFalse(lm.isLeaseActive(leaseId));

        vm.warp(listingStart + 2 hours);
        assertTrue(lm.isLeaseActive(leaseId));
    }

    function test_GetAllActiveLeases() public {
        vm.prank(ncc);
        lm.createLease(requestId);

        LeaseManagement.Lease[] memory active = lm.getAllActiveLeases();
        assertEq(active.length, 1);
    }

    // ── EVENTS ────────────────────────────────────────────────────────────

    function test_EmitsLeaseCreated() public {
        AccessRequest.Request memory req = ar.getRequest(requestId);

        vm.prank(ncc);
        vm.expectEmit(true, true, true, true);
        emit LeaseManagement.LeaseCreated(
            1, listingId, requestId,
            mtn, airtel,
            req.requestedStart, req.requestedEnd
        );
        lm.createLease(requestId);
    }

    function test_EmitsLeaseExpired() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        AccessRequest.Request memory req = ar.getRequest(requestId);
        vm.warp(req.requestedEnd + 1);

        vm.expectEmit(true, true, false, true);
        emit LeaseManagement.LeaseExpired(leaseId, listingId, airtel);
        lm.checkAndExpire(leaseId);
    }

    function test_EmitsLeaseReleased() public {
        vm.prank(ncc);
        uint256 leaseId = lm.createLease(requestId);

        vm.warp(listingStart + 1 hours);

        vm.prank(airtel);
        vm.expectEmit(true, true, false, false);
        emit LeaseManagement.LeaseReleased(leaseId, listingId, airtel, block.timestamp);
        lm.releaseLease(leaseId);
    }
}