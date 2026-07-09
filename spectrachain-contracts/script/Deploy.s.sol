// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/SpectrumListing.sol";
import "../src/AccessRequest.sol";
import "../src/LeaseManagement.sol";
import "../src/DisputeResolution.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        address deployer    = vm.addr(deployerKey);

        vm.startBroadcast(deployerKey);

        // 1. Deploy contracts in dependency order
        SpectrumListing   sl = new SpectrumListing();
        AccessRequest     ar = new AccessRequest(address(sl));
        LeaseManagement   lm = new LeaseManagement(address(sl), address(ar));
        DisputeResolution dr = new DisputeResolution(address(lm));

        // 2. Wire authorisations
        ar.authoriseContract(address(lm));
        lm.authoriseContract(address(dr));

        // 3. Register primary operators
        // Anvil Account 1 — MTN Nigeria
        sl.registerOperator(
            0x70997970C51812dc3A010C7d01b50e0d17dc79C8,
            "MTN Nigeria"
        );
        // Anvil Account 2 — Glo Mobile
        sl.registerOperator(
            0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC,
            "Glo Mobile"
        );

        // 4. Register secondary operators
        // Anvil Account 3 — Airtel Nigeria
        ar.registerSecondary(
            0x90F79bf6EB2c4f870365E785982E1f101E93b906,
            "Airtel Nigeria"
        );
        // Anvil Account 4 — 9mobile Nigeria
       ar.registerSecondary(
            0x15d34aAf46EF01814776135301F927F827c318Ef,
            "9mobile Nigeria"
        );

        vm.stopBroadcast();

        console.log("=== SPECTRACHAIN DEPLOYMENT ===");
        console.log("Deployer:         ", deployer);
        console.log("SpectrumListing:  ", address(sl));
        console.log("AccessRequest:    ", address(ar));
        console.log("LeaseManagement:  ", address(lm));
        console.log("DisputeResolution:", address(dr));
        console.log("==============================");
    }
}