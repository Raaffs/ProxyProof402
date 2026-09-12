// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20; // or =0.8.20
import "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract Reputation is Ownable {
    
    address public immutable identityRegistry;
    address public verificationEngine;

    mapping(uint256 => uint256) public agentTrustPoints;
    mapping(address => uint256) public clientTrustPoints;

    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed client,
        int128 value,
        uint8 valueDecimals
    );

    event TrustPointSlashed(uint256 indexed agentId, address indexed client, uint256 pointsTransferred);
    event TrustPointRedeemed(address indexed client, uint256 indexed receivingAgentId, uint256 amount);

    modifier onlyVerificationEngine() {
        require(msg.sender == verificationEngine, "Caller is not the Verification Engine");
        _;
    }

    constructor(address _identityRegistry) Ownable() {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = _identityRegistry;
    }

    function setVerificationEngine(address _verificationEngine) external onlyOwner {
        require(_verificationEngine != address(0), "Invalid engine address");
        verificationEngine = _verificationEngine;
    }

    /**
     * @notice Minimal Slashing Function
     * Called ONLY by Verification Engine when ZK proof passes.
     */
    function deductAndTransferPoint(
        uint256 agentId,
        address client
    ) external onlyVerificationEngine {
        require(IAgentIdentityRegistry(identityRegistry).ownerOf(agentId) != address(0), "Agent does not exist");

        // Points Logic
        if (agentTrustPoints[agentId] > 0) {
            agentTrustPoints[agentId] -= 1;
        }
        clientTrustPoints[client] += 1;

        emit TrustPointSlashed(agentId, client, 1);

        emit FeedbackSubmitted(
            agentId,
            client,
            -1,  
            0    
        );
    }

    /**
     * @notice Minimal Point Redemption Function
     * Allows client to spend earned Trust Points to hire/boost another agent.
     */
    function payAgentWithPoints(uint256 receivingAgentId, uint256 pointsAmount) external {
        require(clientTrustPoints[msg.sender] >= pointsAmount, "Insufficient trust points");
        require(IAgentIdentityRegistry(identityRegistry).ownerOf(receivingAgentId) != address(0), "Target agent does not exist");

        clientTrustPoints[msg.sender] -= pointsAmount;
        agentTrustPoints[receivingAgentId] += pointsAmount;

        emit TrustPointRedeemed(msg.sender, receivingAgentId, pointsAmount);

        // Required-only ERC-8004 Event emission
        emit FeedbackSubmitted(
            receivingAgentId,
            msg.sender,
            int128(uint128(pointsAmount)), // value (+pointsAmount)
            0                              // valueDecimals
        );
    }
}