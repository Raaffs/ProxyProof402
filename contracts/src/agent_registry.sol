// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // or =0.8.20
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./human_registry.sol"; // <-- Import HumanRegistry (and its interface) here!

contract AgentIdentityRegistry is ERC721, Ownable {
    using ECDSA for bytes32;

    uint256 private _nextTokenId;

    /// @notice Address of the deployed HumanRegistry contract
    IHumanRegistry public immutable humanRegistry;

    /// @notice Core storage structure for an Agent's state
    struct Agent {
        address operationalKey;
        string tokenURI;
        string thirdpartyEndpoint;
        uint128 rate;
    }

    // Consolidated Mapping: Token ID -> Agent Details Struct
    mapping(uint256 => Agent) public agents;

    
    // Events
    event AgentRegistered(
        uint256 indexed tokenId, 
        address indexed owner, 
        address operationalKey, 
        string tokenURI,
        string thirdpartyEndpoint
    );
    event OperationalKeyUpdated(uint256 indexed tokenId, address indexed newOperationalKey);
    event ThirdpartyEndpointUpdated(uint256 indexed tokenId, string newThirdpartyEndpoint);

    constructor(address _humanRegistry) ERC721("ERC8004 Agent Identity", "AGENT") Ownable() {
        require(_humanRegistry != address(0), "Invalid human registry address");
        humanRegistry = IHumanRegistry(_humanRegistry);
    }

    function getAgentThirdPartyEndpoint(uint256 tokenId) public view returns (string memory) {
        return agents[tokenId].thirdpartyEndpoint;
    }
    /**
     * @notice Registers a new AI Agent for msg.sender after verifying human status and Agent signature.
     */
    function registerAgent(
        address operationalKey,
        string calldata uri,
        string calldata thirdpartyEndpoint,
        bytes calldata signature,
        uint128  tinyHbarRate
    ) external returns (uint256) {
        // 1. Verify caller is a registered human in the HumanRegistry
        require(humanRegistry.isHuman(msg.sender), "Caller is not a registered human");
        require(operationalKey != address(0), "Invalid operational key");

        // 2. Reconstruct hash and verify Agent signature
        // Note: Included thirdpartyEndpoint in the hash to prevent parameter tampering
        bytes32 messageHash = keccak256(abi.encodePacked(msg.sender, uri, thirdpartyEndpoint));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);

        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);
        require(recoveredSigner == operationalKey, "Agent did not sign this owner");
        // 3. Mint Agent NFT and write to consolidated struct
        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);

        agents[tokenId] = Agent({
            operationalKey: operationalKey,
            tokenURI: uri,
            thirdpartyEndpoint: thirdpartyEndpoint,
            rate: tinyHbarRate
        });

        emit AgentRegistered(tokenId, msg.sender, operationalKey, uri, thirdpartyEndpoint);
        return tokenId;
    }

    /**
     * @notice Allows the NFT owner to update Agent's operational key with consent from the new key.
     */
function setOperationalKey(
        uint256 tokenId,
        address newOperationalKey,
        bytes calldata signature
    ) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not the agent owner");
        require(newOperationalKey != address(0), "Invalid operational key");

        bytes32 messageHash = keccak256(abi.encodePacked(tokenId, msg.sender, newOperationalKey));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
        
        // FIXED: Changed agentSignature -> signature & matched recoveredSigner variable name
        address recoveredSigner = ethSignedMessageHash.recover(signature);        
        require(recoveredSigner == newOperationalKey, "New operational key did not sign approval");

        agents[tokenId].operationalKey = newOperationalKey;
        emit OperationalKeyUpdated(tokenId, newOperationalKey);
    }
    /**
     * @notice Allows the NFT owner to update the third-party provider URL.
     */
    function setThirdpartyEndpoint(uint256 tokenId, string calldata newThirdpartyEndpoint) external {
        require(ownerOf(tokenId) == msg.sender, "Caller is not the agent owner");
        
        agents[tokenId].thirdpartyEndpoint = newThirdpartyEndpoint;
        emit ThirdpartyEndpointUpdated(tokenId, newThirdpartyEndpoint);
    }

    function verifyAgentKey(uint256 tokenId, address keyToVerify) external view returns (bool isAuthorized, address owner) {
        address currentOwner = _ownerOf(tokenId);
        require(currentOwner != address(0), "Agent does not exist");

        bool isValidKey = (agents[tokenId].operationalKey == keyToVerify);
        return (isValidKey, currentOwner);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Agent does not exist");
        return agents[tokenId].tokenURI;
    }
}