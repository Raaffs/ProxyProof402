// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import { Reputation } from "../src/reputation_registry.sol";
import { AgentUsageValidator } from "../src/validation_registry.sol";

contract DeployScript is Script {
    address constant RECLAIM_ADDRESS = address(0xaE72f9Ab6854965dFEd0fBBD5d6BA1187e512071);
    
    // Existing deployed addresses
    address constant AGENT_REGISTRY_ADDR = 0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1;
    address constant REPUTATION_ADDR = 0x5aa4bdb31669C0806d5E64C46baA3B05F0D23020;

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "ETH_PRIVATE_KEY",
            uint256(0x96d1691d02ea5732baba986d4169cc1060bdf88da2515d739c54fe2cdcbfe69d)
        );

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy ONLY the new validator using the existing addresses
        AgentUsageValidator validator = new AgentUsageValidator(
            RECLAIM_ADDRESS,
            AGENT_REGISTRY_ADDR,
            REPUTATION_ADDR
        );
        console.log("New AgentUsageValidator deployed at:", address(validator));

        // 2. Point to the existing Reputation contract and update its engine
        Reputation(REPUTATION_ADDR).setVerificationEngine(address(validator));
        console.log("Verification engine updated on existing Reputation!");

        vm.stopBroadcast();
    }
}