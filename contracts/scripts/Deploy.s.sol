// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/human_registry.sol";
import "../src/agent_registry.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("ETH_PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy HumanRegistry
        HumanRegistry humanRegistry = new HumanRegistry();
        console.log("HumanRegistry deployed at:", address(humanRegistry));

        // 2. Deploy AgentIdentityRegistry with HumanRegistry address
        AgentIdentityRegistry agentRegistry = new AgentIdentityRegistry(address(humanRegistry));
        console.log("AgentIdentityRegistry deployed at:", address(agentRegistry));

        vm.stopBroadcast();
    }
}