// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SpectrumListing.sol";
import "../src/AccessRequest.sol";

contract AccessRequestTest is Test {

    SpectrumListing public sl;
    AccessRequest   public ar;

    address ncc    = makeAddr("ncc");
    address mtn    = makeAddr("mtn");
    address airtel = makeAddr("airtel");
    address random = makeAddr("random");

    uint256 listingStart;
    uint256 listingEnd;
    uint256 listingId;

    function setUp() public {
        // Deploy both contracts as NCC
        vm.startPrank(ncc);
        sl = new SpectrumListing();
        ar = new AccessRequest(address(sl));

        // Register operators
        sl.registerOperator(mtn, "MTN Nigeria");
        ar.registerSecondary(airtel, "Airtel Nigeria");
        vm.stopPrank();

        // MTN creates a listing
        listingStart = block.timestamp + 1 days;
        listingEnd   = block.timestamp + 30 days;

        vm.prank(mtn);
        listingId = sl.createListing(
            "700 MHz", "Lagos",
            listingStart, listingEnd,
            "Max EIRP 43 dBm"
        );
    }

    // ── REGISTRATION ───────────────────────────────────────────────────────

    function test_SecondaryRegistration() public view {
        assertTrue(ar.registeredSecondary(airtel));
        assertFalse(ar.registeredSecondary(random));
    }

    function test_OnlyOwnerRegistersSecondary() public {
        vm.prank(mtn);
        vm.expectRevert();
        ar.registerSecondary(random, "Random");
    }

    // ── SUBMIT REQUEST ─────────────────────────────────────────────────────

    function test_SubmitAndGrantRequest() public {
        uint256 reqStart = listingStart + 1 hours;
        uint256 reqEnd   = listingStart + 5 days;

        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(listingId, reqStart, reqEnd, "Capacity expansion");

        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Granted));
        assertEq(r.requester, airtel);
        assertEq(r.listingId, listingId);
    }

    function test_UnregisteredCannotRequest() public {
        vm.prank(random);
        vm.expectRevert("Not a registered secondary operator");
        ar.submitRequest(listingId, listingStart + 1, listingEnd - 1, "Purpose");
    }

    function test_PastStartReverts() public {
        vm.prank(airtel);
        vm.expectRevert("Start must be in future");
        ar.submitRequest(listingId, block.timestamp - 1, listingEnd, "Purpose");
    }

    function test_EndBeforeStartReverts() public {
        vm.prank(airtel);
        vm.expectRevert("End must be after start");
        ar.submitRequest(listingId, listingStart + 2, listingStart + 1, "Purpose");
    }

    // ── VALIDATION ─────────────────────────────────────────────────────────

    function test_RejectIfListingDoesNotExist() public {
        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(
            999,
            block.timestamp + 1,
            block.timestamp + 2 days,
            "Purpose"
        );
        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Rejected));
        assertEq(r.rejectionReason, "Listing does not exist");
    }

    function test_RejectIfListingDeactivated() public {
        // MTN deactivates the listing
        vm.prank(mtn);
        sl.deactivateListing(listingId);

        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(
            listingId,
            listingStart + 1,
            listingEnd   - 1,
            "Purpose"
        );
        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Rejected));
        assertEq(r.rejectionReason, "Listing is not active");
    }

    function test_RejectIfStartBeforeListingWindow() public {
        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(
            listingId,
            listingStart - 1 hours, // before listing opens
            listingEnd   - 1,
            "Purpose"
        );
        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Rejected));
        assertEq(r.rejectionReason, "Requested start is before listing window");
    }

    function test_RejectIfEndExceedsListingWindow() public {
        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(
            listingId,
            listingStart + 1,
            listingEnd   + 1 days, // past listing end
            "Purpose"
        );
        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Rejected));
        assertEq(r.rejectionReason, "Requested end exceeds listing window");
    }

    function test_RejectOnConflictingGrant() public {
        // Register a second secondary operator
        vm.prank(ncc);
        ar.registerSecondary(random, "9mobile Nigeria");

        // First request — gets granted
        vm.prank(airtel);
        ar.submitRequest(
            listingId,
            listingStart + 1 hours,
            listingStart + 10 days,
            "First request"
        );

        // Second request with overlapping window — should be rejected
        vm.prank(random);
        uint256 reqId2 = ar.submitRequest(
            listingId,
            listingStart + 5 days,  // overlaps with first
            listingStart + 15 days,
            "Second request"
        );

        AccessRequest.Request memory r = ar.getRequest(reqId2);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Rejected));
        assertEq(r.rejectionReason, "Conflicting active lease exists for this listing");
    }

    function test_NonOverlappingGrantsAllowed() public {
        // Register second secondary
        vm.prank(ncc);
        ar.registerSecondary(random, "9mobile Nigeria");

        // First grant: days 1-10
        vm.prank(airtel);
        ar.submitRequest(listingId, listingStart + 1, listingStart + 10 days, "First");

        // Clear active grant to simulate lease expiry
        vm.prank(ncc);
        ar.clearActiveGrant(listingId);

        // Second grant: days 11-20 — should succeed
        vm.prank(random);
        uint256 reqId2 = ar.submitRequest(
            listingId,
            listingStart + 11 days,
            listingStart + 20 days,
            "Second"
        );

        AccessRequest.Request memory r = ar.getRequest(reqId2);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Granted));
    }

    // ── QUERIES ────────────────────────────────────────────────────────────

    function test_GetRequestsByRequester() public {
        vm.startPrank(airtel);
        ar.submitRequest(listingId, listingStart + 1, listingStart + 5 days, "First");
        vm.stopPrank();

        AccessRequest.Request[] memory reqs = ar.getRequestsByRequester(airtel);
        assertEq(reqs.length, 1);
        assertEq(reqs[0].requester, airtel);
    }

    function test_GetActiveGrant() public {
        vm.prank(airtel);
        ar.submitRequest(listingId, listingStart + 1, listingStart + 5 days, "Purpose");

        AccessRequest.Request memory grant = ar.getActiveGrant(listingId);
        assertEq(grant.requester, airtel);
        assertEq(uint(grant.status), uint(AccessRequest.RequestStatus.Granted));
    }

    function test_GetActiveGrantRevertsIfNone() public {
        vm.expectRevert("No active grant for this listing");
        ar.getActiveGrant(listingId);
    }

    // ── EVENTS ────────────────────────────────────────────────────────────

    function test_EmitsLeaseGranted() public {
        uint256 reqStart = listingStart + 1 hours;
        uint256 reqEnd   = listingStart + 5 days;

        vm.prank(airtel);
        vm.expectEmit(true, true, true, true);
        emit AccessRequest.LeaseGranted(1, listingId, airtel, reqStart, reqEnd);
        ar.submitRequest(listingId, reqStart, reqEnd, "Purpose");
    }

    function test_EmitsRequestRejected() public {
        vm.prank(mtn);
        sl.deactivateListing(listingId);

        vm.prank(airtel);
        vm.expectEmit(true, true, true, false);
        emit AccessRequest.RequestRejected(1, listingId, airtel, "Listing is not active");
        ar.submitRequest(listingId, listingStart + 1, listingEnd - 1, "Purpose");
    }

    // ── FUZZ ──────────────────────────────────────────────────────────────

    function testFuzz_GrantWithinWindow(uint256 offset, uint256 duration) public {
        offset   = bound(offset,   1,       listingEnd - listingStart - 2 hours);
        duration = bound(duration, 1 hours, listingEnd - listingStart - offset);

        uint256 reqStart = listingStart + offset;
        uint256 reqEnd   = reqStart     + duration;

        vm.assume(reqStart > block.timestamp);
        vm.assume(reqEnd   <= listingEnd);

        vm.prank(airtel);
        uint256 reqId = ar.submitRequest(listingId, reqStart, reqEnd, "Fuzz");

        AccessRequest.Request memory r = ar.getRequest(reqId);
        assertEq(uint(r.status), uint(AccessRequest.RequestStatus.Granted));
    }
}