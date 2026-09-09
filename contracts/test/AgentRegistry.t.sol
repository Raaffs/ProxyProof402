// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "../src/human_registry.sol";
import "../src/agent_registry.sol";

contract AgentRegistryTest is Test {
    HumanRegistry public humanRegistry;
    AgentIdentityRegistry public agentRegistry;

    // Test Users
    address public humanUser = address(0x111);
    address public nonHumanUser = address(0x222);
    address public attacker = address(0x999);

    // Operational Key A (Agent 1)
    uint256 internal agent1PrivateKey = 0xA11CE;
    address public agent1Key;

    // Operational Key B (Agent 2)
    uint256 internal agent2PrivateKey = 0xB0B;
    address public agent2Key;

    event AgentRegistered(uint256 indexed tokenId, address indexed owner, address operationalKey, string tokenURI);
    event OperationalKeyUpdated(uint256 indexed tokenId, address indexed newOperationalKey);

    function setUp() public {
        agent1Key = vm.addr(agent1PrivateKey);
        agent2Key = vm.addr(agent2PrivateKey);

        // 1. Deploy Human Registry
        humanRegistry = new HumanRegistry();

        // 2. Deploy Agent Identity Registry with HumanRegistry address
        agentRegistry = new AgentIdentityRegistry(address(humanRegistry));

        // 3. Register humanUser in HumanRegistry
        vm.prank(humanUser);
        humanRegistry.registerHuman();
    }

    /* =========================================================================
       HELPERS FOR SIGNATURE CREATION
       ========================================================================= */

    function _signRegistration(
        uint256 signerPrivateKey,
        address user,
        string memory uri
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(user, uri, block.chainid));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    function _signKeyUpdate(
        uint256 signerPrivateKey,
        uint256 tokenId,
        address user,
        address newKey
    ) internal view returns (bytes memory) {
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, user, newKey, block.chainid));
        bytes32 ethSignedHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, ethSignedHash);
        return abi.encodePacked(r, s, v);
    }

    /* =========================================================================
       HUMAN REGISTRY TESTS
       ========================================================================= */

    function test_HumanRegistry_RegisterSuccess() public {
        assertTrue(humanRegistry.isHuman(humanUser));
        assertFalse(humanRegistry.isHuman(nonHumanUser));
    }

    /* =========================================================================
       AGENT REGISTRATION TESTS
       ========================================================================= */

    function test_RegisterAgent_Success() public {
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory sig = _signRegistration(agent1PrivateKey, humanUser, uri);

        vm.expectEmit(true, true, false, true);
        emit AgentRegistered(1, humanUser, agent1Key, uri);

        vm.prank(humanUser);
        uint256 tokenId = agentRegistry.registerAgent(agent1Key, uri, sig);

        assertEq(tokenId, 1);
        assertEq(agentRegistry.ownerOf(1), humanUser);
        assertEq(agentRegistry.agentOperationalKeys(1), agent1Key);
        assertEq(agentRegistry.tokenURI(1), uri);

        // Verify key mapping view
        (bool isAuth, address owner) = agentRegistry.verifyAgentKey(1, agent1Key);
        assertTrue(isAuth);
        assertEq(owner, humanUser);
    }

    function test_RevertWhen_CallerIsNotHuman() public {
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory sig = _signRegistration(agent1PrivateKey, nonHumanUser, uri);

        vm.expectRevert("Caller is not a registered human");
        vm.prank(nonHumanUser);
        agentRegistry.registerAgent(agent1Key, uri, sig);
    }

    function test_RevertWhen_OperationalKeyIsZeroAddress() public {
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory sig = _signRegistration(agent1PrivateKey, humanUser, uri);

        vm.expectRevert("Invalid operational key");
        vm.prank(humanUser);
        agentRegistry.registerAgent(address(0), uri, sig);
    }

    function test_RevertWhen_AgentSignatureIsInvalid() public {
        string memory uri = "ipfs://QmAgentCard1";
        
        // Signed by wrong private key (attacker key)
        uint256 wrongKey = 0xBAD999;
        bytes memory badSig = _signRegistration(wrongKey, humanUser, uri);

        vm.expectRevert("Agent did not sign this owner");
        vm.prank(humanUser);
        agentRegistry.registerAgent(agent1Key, uri, badSig);
    }

    function test_RevertWhen_RegistrationSignatureReusedForDifferentUser() public {
        string memory uri = "ipfs://QmAgentCard1";
        
        // Signature intended for humanUser
        bytes memory sig = _signRegistration(agent1PrivateKey, humanUser, uri);

        // Register another human and try to steal agent1Key using humanUser's signature
        address humanUser2 = address(0x333);
        vm.prank(humanUser2);
        humanRegistry.registerHuman();

        vm.expectRevert("Agent did not sign this owner");
        vm.prank(humanUser2);
        agentRegistry.registerAgent(agent1Key, uri, sig);
    }

    /* =========================================================================
       OPERATIONAL KEY UPDATE TESTS
       ========================================================================= */

    function test_SetOperationalKey_Success() public {
        // 1. Register agent
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory regSig = _signRegistration(agent1PrivateKey, humanUser, uri);

        vm.prank(humanUser);
        uint256 tokenId = agentRegistry.registerAgent(agent1Key, uri, regSig);

        // 2. Sign update with new operational key (agent2Key)
        bytes memory updateSig = _signKeyUpdate(agent2PrivateKey, tokenId, humanUser, agent2Key);

        vm.expectEmit(true, true, false, false);
        emit OperationalKeyUpdated(tokenId, agent2Key);

        vm.prank(humanUser);
        agentRegistry.setOperationalKey(tokenId, agent2Key, updateSig);

        assertEq(agentRegistry.agentOperationalKeys(tokenId), agent2Key);

        // Verify old key fails verification, new key succeeds
        (bool oldAuth, ) = agentRegistry.verifyAgentKey(tokenId, agent1Key);
        (bool newAuth, ) = agentRegistry.verifyAgentKey(tokenId, agent2Key);
        assertFalse(oldAuth);
        assertTrue(newAuth);
    }

    function test_RevertWhen_SetOperationalKey_CallerIsNotOwner() public {
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory regSig = _signRegistration(agent1PrivateKey, humanUser, uri);

        vm.prank(humanUser);
        uint256 tokenId = agentRegistry.registerAgent(agent1Key, uri, regSig);

        bytes memory updateSig = _signKeyUpdate(agent2PrivateKey, tokenId, attacker, agent2Key);

        vm.expectRevert("Caller is not the agent owner");
        vm.prank(attacker);
        agentRegistry.setOperationalKey(tokenId, agent2Key, updateSig);
    }

    function test_RevertWhen_SetOperationalKey_NewKeyDidNotSign() public {
        string memory uri = "ipfs://QmAgentCard1";
        bytes memory regSig = _signRegistration(agent1PrivateKey, humanUser, uri);

        vm.prank(humanUser);
        uint256 tokenId = agentRegistry.registerAgent(agent1Key, uri, regSig);

        // Signed by agent1PrivateKey instead of agent2PrivateKey
        bytes memory badUpdateSig = _signKeyUpdate(agent1PrivateKey, tokenId, humanUser, agent2Key);

        vm.expectRevert("New operational key did not sign approval");
        vm.prank(humanUser);
        agentRegistry.setOperationalKey(tokenId, agent2Key, badUpdateSig);
    }

    /* =========================================================================
       VERIFY & READ STATE TESTS
       ========================================================================= */

    function test_RevertWhen_VerifyingNonExistentAgent() public {
        vm.expectRevert("Agent does not exist");
        agentRegistry.verifyAgentKey(999, agent1Key);
    }

    function test_RevertWhen_QueryingURIForNonExistentAgent() public {
        vm.expectRevert("Agent does not exist");
        agentRegistry.tokenURI(999);
    }

    function test_RevertWhen_DeployingWithZeroAddressRegistry() public {
        vm.expectRevert("Invalid human registry address");
        new AgentIdentityRegistry(address(0));
    }
}