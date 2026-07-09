// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/SpectrumListing.sol";

contract SpectrumListingTest is Test {

    SpectrumListing public sl;

    address ncc    = makeAddr("ncc");
    address mtn    = makeAddr("mtn");
    address glo    = makeAddr("glo");
    address airtel = makeAddr("airtel"); // unregistered

    uint256 futureStart;
    uint256 futureEnd;

    function setUp() public {
        vm.prank(ncc);
        sl = new SpectrumListing();

        futureStart = block.timestamp + 1 days;
        futureEnd   = block.timestamp + 2 days;

        vm.startPrank(ncc);
        sl.registerOperator(mtn, "MTN Nigeria");
        sl.registerOperator(glo, "Glo Mobile");
        vm.stopPrank();
    }

    // ── REGISTRATION ───────────────────────────────────────────────────────

    function test_RegisterOperator() public view {
        assertTrue(sl.registeredOperators(mtn));
        assertTrue(sl.registeredOperators(glo));
        assertFalse(sl.registeredOperators(airtel));
    }

    function test_OnlyOwnerCanRegister() public {
        vm.prank(mtn);
        vm.expectRevert();
        sl.registerOperator(airtel, "Airtel");
    }

    function test_CannotRegisterTwice() public {
        vm.prank(ncc);
        vm.expectRevert("Already registered");
        sl.registerOperator(mtn, "MTN Nigeria");
    }

    function test_RemoveOperator() public {
        vm.prank(ncc);
        sl.removeOperator(glo);
        assertFalse(sl.registeredOperators(glo));
    }

    function test_RemovedOperatorCannotList() public {
        vm.prank(ncc);
        sl.removeOperator(glo);

        vm.prank(glo);
        vm.expectRevert("Not a registered NCC operator");
        sl.createListing("800 MHz", "Lagos", futureStart, futureEnd, "Cond");
    }

    // ── LISTING CREATION ───────────────────────────────────────────────────

    function test_CreateListing() public {
        vm.prank(mtn);
        uint256 id = sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "No interference");

        assertEq(id, 1);

        SpectrumListing.Listing memory l = sl.getListing(1);
        assertEq(l.owner,    mtn);
        assertEq(l.band,     "700 MHz");
        assertEq(l.area,     "Lagos");
        assertEq(l.startTime, futureStart);
        assertEq(l.endTime,   futureEnd);
        assertEq(uint(l.status), uint(SpectrumListing.ListingStatus.Active));
    }

    function test_UnregisteredCannotList() public {
        vm.prank(airtel);
        vm.expectRevert("Not a registered NCC operator");
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");
    }

    function test_PastStartTimeReverts() public {
        vm.prank(mtn);
        vm.expectRevert("Start must be in future");
        sl.createListing("700 MHz", "Lagos", block.timestamp - 1, futureEnd, "Cond");
    }

    function test_EndBeforeStartReverts() public {
        vm.prank(mtn);
        vm.expectRevert("End must be after start");
        sl.createListing("700 MHz", "Lagos", futureStart, futureStart - 1, "Cond");
    }

    function test_EmptyBandReverts() public {
        vm.prank(mtn);
        vm.expectRevert("Band cannot be empty");
        sl.createListing("", "Lagos", futureStart, futureEnd, "Cond");
    }

    function test_EmptyAreaReverts() public {
        vm.prank(mtn);
        vm.expectRevert("Area cannot be empty");
        sl.createListing("700 MHz", "", futureStart, futureEnd, "Cond");
    }

    function test_EmptyConditionsReverts() public {
        vm.prank(mtn);
        vm.expectRevert("Conditions cannot be empty");
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "");
    }

    function test_MultipleListings() public {
        vm.startPrank(mtn);
        sl.createListing("700 MHz",  "Lagos", futureStart, futureEnd, "A");
        sl.createListing("1800 MHz", "Abuja", futureStart, futureEnd, "B");
        vm.stopPrank();

        assertEq(sl.getTotalListings(), 2);
    }

    // ── DEACTIVATION ───────────────────────────────────────────────────────

    function test_DeactivateListing() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");

        vm.prank(mtn);
        sl.deactivateListing(1);

        SpectrumListing.Listing memory l = sl.getListing(1);
        assertEq(uint(l.status), uint(SpectrumListing.ListingStatus.Deactivated));
    }

    function test_OnlyOwnerCanDeactivate() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");

        vm.prank(glo);
        vm.expectRevert("Not listing owner");
        sl.deactivateListing(1);
    }

    function test_CannotDeactivateTwice() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");

        vm.prank(mtn);
        sl.deactivateListing(1);

        vm.prank(mtn);
        vm.expectRevert("Listing not active");
        sl.deactivateListing(1);
    }

    // ── QUERIES ────────────────────────────────────────────────────────────

    function test_GetActiveListings() public {
        vm.startPrank(mtn);
        sl.createListing("700 MHz",  "Lagos", futureStart, futureEnd, "A");
        sl.createListing("1800 MHz", "Abuja", futureStart, futureEnd, "B");
        sl.deactivateListing(1);
        vm.stopPrank();

        SpectrumListing.Listing[] memory active = sl.getActiveListings();
        assertEq(active.length,   1);
        assertEq(active[0].band,  "1800 MHz");
    }

    function test_GetListingsByOperator() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "A");

        vm.prank(glo);
        sl.createListing("800 MHz", "Kano", futureStart, futureEnd, "B");

        SpectrumListing.Listing[] memory mtnListings = sl.getListingsByOperator(mtn);
        assertEq(mtnListings.length,  1);
        assertEq(mtnListings[0].band, "700 MHz");
    }

    function test_IsAvailable() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");

        // Before window opens — not yet available
        assertFalse(sl.isAvailable(1));

        // Warp into the window
        vm.warp(futureStart + 1);
        assertTrue(sl.isAvailable(1));

        // Warp past end
        vm.warp(futureEnd + 1);
        assertFalse(sl.isAvailable(1));
    }

    function test_NonExistentListingReverts() public {
        vm.expectRevert("Listing does not exist");
        sl.getListing(999);
    }

    // ── EVENTS ────────────────────────────────────────────────────────────

    function test_EmitsListingCreated() public {
        vm.prank(mtn);
        vm.expectEmit(true, true, false, true);
        emit SpectrumListing.ListingCreated(1, mtn, "700 MHz", "Lagos", futureStart, futureEnd);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");
    }

    function test_EmitsListingDeactivated() public {
        vm.prank(mtn);
        sl.createListing("700 MHz", "Lagos", futureStart, futureEnd, "Cond");

        vm.prank(mtn);
        vm.expectEmit(true, true, false, false);
        emit SpectrumListing.ListingDeactivated(1, mtn);
        sl.deactivateListing(1);
    }

    function test_EmitsOperatorRegistered() public {
        vm.prank(ncc);
        vm.expectEmit(true, false, false, true);
        emit SpectrumListing.OperatorRegistered(airtel, "Airtel Nigeria");
        sl.registerOperator(airtel, "Airtel Nigeria");
    }

    // ── FUZZ ──────────────────────────────────────────────────────────────

    function testFuzz_CreateListing(uint256 start, uint256 duration) public {
        // Keep values sane
        start    = bound(start,    block.timestamp + 1,  block.timestamp + 365 days);
        duration = bound(duration, 1 hours,              180 days);

        uint256 end = start + duration;

        vm.prank(mtn);
        uint256 id = sl.createListing("700 MHz", "Abuja", start, end, "Fuzz test");
        assertEq(id, 1);

        SpectrumListing.Listing memory l = sl.getListing(1);
        assertEq(l.startTime, start);
        assertEq(l.endTime,   end);
    }
}