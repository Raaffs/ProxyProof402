// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Script.sol";
import { HumanRegistry } from "../src/human_registry.sol";
import { AgentIdentityRegistry } from "../src/agent_registry.sol";
import { Reputation } from "../src/reputation_registry.sol";
import { AgentUsageValidator } from "../src/validation_registry.sol";

contract DeployScript is Script {
    address constant RECLAIM_ADDRESS = address(0x1111111111111111111111111111111111111111);

    function run() external {
        uint256 deployerPrivateKey = vm.envUint(
            "ETH_PRIVATE_KEY"
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