// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

interface IAgentIdentityRegistry {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract Reputation is Ownable {
    uint256 public constant DEFAULT_TRUST_SCORE = 50;

    address public immutable identityRegistry;
    address public verificationEngine;

    // Direct storage mapping (internal to enforce default fallback)
    mapping(uint256 => uint256) private _agentTrustPoints;
    mapping(uint256 => bool) private _hasBeenInitialized;

    mapping(address => uint256) public clientTrustPoints;

    event FeedbackSubmitted(
        uint256 indexed agentId,
        address indexed client,
        int128 value,
        uint8 valueDecimals
    );

    event TrustPointSlashed(
        uint256 indexed agentId,
        address indexed client,
        uint256 pointsTransferred
    );
    event TrustPointRedeemed(
        address indexed client,
        uint256 indexed receivingAgentId,
        uint256 amount
    );

    modifier onlyVerificationEngine() {
        require(
            msg.sender == verificationEngine,
            "Caller is not the Verification Engine"
        );
        _;
    }

    constructor(address _identityRegistry) Ownable() {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = _identityRegistry;
    }

    function setVerificationEngine(
        address _verificationEngine
    ) external onlyOwner {
        require(_verificationEngine != address(0), "Invalid engine address");
        verificationEngine = _verificationEngine;
    }

    /**
     * @notice Returns the agent's trust points, defaulting to 50 if untouched.
     */
    function agentTrustPoints(uint256 agentId) public view returns (uint256) {
        if (!_hasBeenInitialized[agentId]) {
            return DEFAULT_TRUST_SCORE;
        }
        return _agentTrustPoints[agentId];
    }

    /**
     * @notice Minimal Slashing Function
     * Called ONLY by Verification Engine when ZK proof passes.
     */
    function deductAndTransferPoint(
        uint256 agentId,
        address client
    ) external onlyVerificationEngine {
        require(
            IAgentIdentityRegistry(identityRegistry).ownerOf(agentId) !=
                address(0),
            "Agent does not exist"
        );

        uint256 currentPoints = agentTrustPoints(agentId);

        // Deduct point from baseline/current score
        if (currentPoints > 0) {
            _agentTrustPoints[agentId] = currentPoints - 1;
        } else {
            _agentTrustPoints[agentId] = 0;
        }

        _hasBeenInitialized[agentId] = true;
        clientTrustPoints[client] += 1;

        emit TrustPointSlashed(agentId, client, 1);

        emit FeedbackSubmitted(agentId, client, -1, 0);
    }

    /**
     * @notice Minimal Point Redemption Function
     * Allows client to spend earned Trust Points to hire/boost another agent.
     */
    function payAgentWithPoints(
        uint256 receivingAgentId,
        uint256 pointsAmount
    ) external {
        require(
            clientTrustPoints[msg.sender] >= pointsAmount,
            "Insufficient trust points"
        );
        require(
            IAgentIdentityRegistry(identityRegistry).ownerOf(
                receivingAgentId
            ) != address(0),
            "Target agent does not exist"
        );

        clientTrustPoints[msg.sender] -= pointsAmount;

        // Add to existing baseline/current score
        _agentTrustPoints[receivingAgentId] =
            agentTrustPoints(receivingAgentId) +
            pointsAmount;
        _hasBeenInitialized[receivingAgentId] = true;

        emit TrustPointRedeemed(msg.sender, receivingAgentId, pointsAmount);

        emit FeedbackSubmitted(
            receivingAgentId,
            msg.sender,
            int128(uint128(pointsAmount)),
            0
        );
    }
}
