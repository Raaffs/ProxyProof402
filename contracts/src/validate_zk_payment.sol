// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract EscrowZkVerifier is ReentrancyGuard {
    struct Session {
        address consumer;
        address provider;
        uint256 depositAmount;
        uint256 tokenRate;
        bool isSettled;
    }

    mapping(bytes32 => Session) public sessions;

    function settleSession(
        bytes32 sessionId, 
        uint256 tokensUsed, 
        bytes memory zkProof
    ) external nonReentrant { // <--- 1. Lock Reentrancy Guard
        Session storage session = sessions[sessionId];

        require(session.consumer != address(0), "Session does not exist");
        require(!session.isSettled, "Session already settled");
        require(msg.sender == session.provider, "Only provider can settle");
        require(verifyMockProof(zkProof, tokensUsed), "Invalid ZK Proof!");

        uint256 totalCost = tokensUsed * session.tokenRate;
        uint256 providerPayout = totalCost > session.depositAmount ? session.depositAmount : totalCost;
        uint256 consumerRefund = session.depositAmount - providerPayout;

        session.isSettled = true; // <--- 2. Updated BEFORE external calls!

        (bool providerSuccess, ) = payable(session.provider).call{value: providerPayout}("");
        require(providerSuccess, "Provider transfer failed");

        if (consumerRefund > 0) {
            (bool consumerSuccess, ) = payable(session.consumer).call{value: consumerRefund}("");
            if (!consumerSuccess) {
            }
        }
    }

    function verifyMockProof(bytes memory proof, uint256 tokensUsed) public pure returns (bool) {
        return proof.length > 0 && tokensUsed > 0;
    }
}