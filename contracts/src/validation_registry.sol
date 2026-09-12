// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@reclaimprotocol/verifier-solidity-sdk/contracts/Reclaim.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
interface IAgentIdentityRegistry {
    function getAgentThirdPartyEndpoint(uint256 tokenId) external view returns (string memory);
    function verifyAgentKey(uint256 tokenId, address keyToVerify) external view returns (bool isAuthorized, address owner);
    function agents(uint256 tokenId) external view returns (address operationalKey, string memory tokenURI, string memory thirdpartyEndpoint, uint128 rate);
}

interface IReputation {
    function deductAndTransferPoint(uint256 agentId, address client) external;
}

contract AgentUsageValidator {
    using ECDSA for bytes32;

    address public immutable reclaimAddress;
    IAgentIdentityRegistry public immutable agentRegistry;
    IReputation public immutable reputationContract;

    event ValidationResult(
        uint256 indexed agentId, 
        uint256 actualTokensUsed, 
        uint256 actualCostTinybars, 
        bool slashed
    );

    constructor(address _reclaimAddress, address _agentRegistry, address _reputationContract) {
        reclaimAddress = _reclaimAddress;
        agentRegistry = IAgentIdentityRegistry(_agentRegistry);
        reputationContract = IReputation(_reputationContract);
    }

    /**
     * @notice Verifies Reclaim zkProof, agent signature, rate calculation, and slashes on cost mismatch.
     * @param tokenId Agent Identity NFT Token ID
     * @param agentSignature Signature from the agent authorizing this session/tokenId data
     * @param proof Outer Reclaim zkTLS proof
     */
    function validateUsage(
        uint256 tokenId,
        bytes calldata agentSignature,
        Reclaim.Proof memory proof
    ) external returns (uint256 actualTokensUsed, bool slashed) {
        // 1. Recover Agent Key from Signature
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredAgentKey = ECDSA.recover(ethSignedMessageHash, agentSignature);
        // 2. Verify recovered key is authorized for the given tokenId
        (bool isAuthorized, ) = agentRegistry.verifyAgentKey(tokenId, recoveredAgentKey);
        require(isAuthorized, "Invalid agent signature for tokenId");

        // 3. Verify outer zkTLS proof cryptographically
        Reclaim(reclaimAddress).verifyProof(proof);

        // 4. Match proof endpoint against registered endpoint
        string memory expectedUrl = agentRegistry.getAgentThirdPartyEndpoint(tokenId);
        if (bytes(expectedUrl).length > 0) {
            string memory actualUrl = extractJsonStringValue(proof.claimInfo.parameters, '\\"url\\":\\"');
            require(
                keccak256(bytes(actualUrl)) == keccak256(bytes(expectedUrl)),
                "Proof URL does not match agent endpoint"
            );
        }

        // 5. Extract verified token count & actual cost from Reclaim proof context
        actualTokensUsed = extractJsonUintValue(proof.claimInfo.context, '"totalTokenCount":');
        uint256 actualCostTinybars = extractJsonUintValue(proof.claimInfo.context, '"actualCostTinybars":"');

        // 6. Rate & Cost Check -> Slash Agent if actualCostTinybars != rate * actualTokensUsed
        (,,, uint128 rate) = agentRegistry.agents(tokenId);
        uint256 expectedCost = uint256(rate) * actualTokensUsed;

        if (actualCostTinybars != expectedCost) {
            reputationContract.deductAndTransferPoint(tokenId, msg.sender);
            slashed = true;
        }

        emit ValidationResult(tokenId, actualTokensUsed, actualCostTinybars, slashed);
    }

    // --- In-line String Search Helpers ---

    function extractJsonStringValue(string memory source, string memory key) internal pure returns (string memory) {
        bytes memory src = bytes(source);
        bytes memory k = bytes(key);
        int256 startIdx = indexOf(src, k);
        require(startIdx >= 0, "URL key not found");

        uint256 valueStart = uint256(startIdx) + k.length;
        uint256 valueEnd = valueStart;

        while (valueEnd < src.length && src[valueEnd] != '"' && src[valueEnd] != '\\') {
            valueEnd++;
        }

        bytes memory result = new bytes(valueEnd - valueStart);
        for (uint256 i = 0; i < valueEnd - valueStart; i++) {
            result[i] = src[valueStart + i];
        }

        return string(result);
    }

    function extractJsonUintValue(string memory source, string memory key) internal pure returns (uint256) {
        bytes memory src = bytes(source);
        bytes memory k = bytes(key);
        int256 startIdx = indexOf(src, k);
        require(startIdx >= 0, "Key not found");

        uint256 valueStart = uint256(startIdx) + k.length;
        while (valueStart < src.length && (src[valueStart] == ' ' || src[valueStart] == ':' || src[valueStart] == '"')) {
            valueStart++;
        }

        uint256 valueEnd = valueStart;
        while (valueEnd < src.length && src[valueEnd] >= '0' && src[valueEnd] <= '9') {
            valueEnd++;
        }

        uint256 result = 0;
        for (uint256 i = valueStart; i < valueEnd; i++) {
            result = result * 10 + (uint8(src[i]) - 48);
        }

        return result;
    }

    function indexOf(bytes memory haystack, bytes memory needle) internal pure returns (int256) {
        if (haystack.length < needle.length) return -1;
        for (uint256 i = 0; i <= haystack.length - needle.length; i++) {
            bool found = true;
            for (uint256 j = 0; j < needle.length; j++) {
                if (haystack[i + j] != needle[j]) {
                    found = false;
                    break;
                }
            }
            if (found) return int256(i);
        }
        return -1;
    }
}