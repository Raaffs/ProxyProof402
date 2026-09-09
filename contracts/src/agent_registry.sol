// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "./human_registry.sol"; // <-- Import HumanRegistry (and its interface) here!

contract AgentIdentityRegistry is ERC721, Ownable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;

    /// @notice Address of the deployed HumanRegistry contract
    IHumanRegistry public immutable humanRegistry;

    // Maps Token ID -> Agent Metadata URI (Agent Card JSON)
    mapping(uint256 => string) private _agentURIs;

    // Mapping from Token ID -> Operational Key (Agent A's Address)
    mapping(uint256 => address) public agentOperationalKeys;

    event AgentRegistered(uint256 indexed tokenId, address indexed owner, address operationalKey, string tokenURI);
    event OperationalKeyUpdated(uint256 indexed tokenId, address indexed newOperationalKey);

    constructor(address _humanRegistry) ERC721("ERC8004 Agent Identity", "AGENT") Ownable(msg.sender) {
        require(_humanRegistry != address(0), "Invalid human registry address");
        humanRegistry = IHumanRegistry(_humanRegistry);
    }

    /**
     * @notice Registers a new AI Agent for msg.sender after verifying human status and Agent signature.
     */
    function registerAgent(
        address operationalKey,
        string calldata uri,
        bytes calldata signature
    ) external returns (uint256) {
        // 1. Verify caller is a registered human in the HumanRegistry
        require(humanRegistry.isHuman(msg.sender), "Caller is not a registered human");
        require(operationalKey != address(0), "Invalid operational key");

        // 2. Reconstruct hash and verify Agent signature
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, uri, block.chainid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == operationalKey, "Agent did not sign this owner");

        // 3. Mint Agent NFT and record keys
        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        _agentURIs[tokenId] = uri;
        agentOperationalKeys[tokenId] = operationalKey;

        emit AgentRegistered(tokenId, msg.sender, operationalKey, uri);
        return tokenId;
    }

    /**
     * @notice Allows the NFT owner to update Agent A's operational key with consent from the new key.
     */
    function setOperationalKey(
        uint256 tokenId,
        address newOperationalKey,
        bytes calldata signature
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not the agent owner");
        require(newOperationalKey != address(0), "Invalid operational key");

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, msg.sender, newOperationalKey, block.chainid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);

        address recoveredSigner = ethSignedMessageHash.recover(signature);
        require(recoveredSigner == newOperationalKey, "New operational key did not sign approval");

        agentOperationalKeys[tokenId] = newOperationalKey;
        emit OperationalKeyUpdated(tokenId, newOperationalKey);
    }

    function verifyAgentKey(uint256 tokenId, address keyToVerify) external view returns (bool isAuthorized, address owner) {
        address currentOwner = _ownerOf(tokenId);
        require(currentOwner != address(0), "Agent does not exist");

        bool isValidKey = (agentOperationalKeys[tokenId] == keyToVerify);
        return (isValidKey, currentOwner);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return _agentURIs[tokenId];
    }
}