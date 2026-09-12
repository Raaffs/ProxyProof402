// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import { HumanRegistry } from "../src/human_registry.sol";
import { AgentIdentityRegistry } from "../src/agent_registry.sol";
import { Reputation } from "../src/reputation_registry.sol";
import { AgentUsageValidator } from "../src/validation_registry.sol";

contract DeployScript is Script {
    address constant RECLAIM_ADDRESS = address(0xaE72f9Ab6854965dFEd0fBBD5d6BA1187e512071);

    function run() external {
        uint256 deployerPrivateKey = vm.envOr(
            "ETH_PRIVATE_KEY",
            uint256(0x96d1691d02ea5732baba986d4169cc1060bdf88da2515d739c54fe2cdcbfe69d)
        );

        vm.startBroadcast(deployerPrivateKey);

        HumanRegistry humanRegistry = new HumanRegistry();
        console.log("HumanRegistry deployed at:", address(humanRegistry));

        AgentIdentityRegistry agentRegistry = new AgentIdentityRegistry(address(humanRegistry));
        console.log("AgentIdentityRegistry deployed at:", address(agentRegistry));

        Reputation reputation = new Reputation(address(agentRegistry));
        console.log("Reputation deployed at:", address(reputation));

        AgentUsageValidator validator = new AgentUsageValidator(
            RECLAIM_ADDRESS,
            address(agentRegistry),
            address(reputation)
        );
        console.log("AgentUsageValidator deployed at:", address(validator));

        reputation.setVerificationEngine(address(validator));
        console.log("Verification engine set!");

        vm.stopBroadcast();
    }
}