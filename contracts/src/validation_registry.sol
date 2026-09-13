// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@reclaimprotocol/verifier-solidity-sdk/contracts/Reclaim.sol";
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

    function validateUsage(
        uint256 tokenId,
        bytes calldata agentSignature,
        Reclaim.Proof memory proof
    ) external returns (uint256 actualTokensUsed, bool slashed) {
        // 1. Recover Agent Key from Signature
        bytes32 messageHash = keccak256(abi.encodePacked(tokenId));
        bytes32 ethSignedMessageHash = ECDSA.toEthSignedMessageHash(messageHash);
        address recoveredAgentKey = ECDSA.recover(ethSignedMessageHash, agentSignature);

        // 2. Verify recovered key is authorized
        (bool isAuthorized, ) = agentRegistry.verifyAgentKey(tokenId, recoveredAgentKey);
        require(isAuthorized, "Invalid agent signature for tokenId");

        // 3. Verify outer zkTLS proof cryptographically
        Reclaim(reclaimAddress).verifyProof(proof);

        // 4. Match proof endpoint using key '"url":"'
        string memory expectedUrl = agentRegistry.getAgentThirdPartyEndpoint(tokenId);
        if (bytes(expectedUrl).length > 0) {
            string memory actualUrl = extractJsonStringValue(proof.claimInfo.parameters, '"url":"');
            if(keccak256(bytes(actualUrl)) != keccak256(bytes(expectedUrl))){
                slashed = true;
                reputationContract.deductAndTransferPoint(tokenId, msg.sender);
            }
        }

    }

    // --- Helper Functions ---

    function extractJsonStringValue(string memory source, string memory key) internal pure returns (string memory) {
        bytes memory src = bytes(source);
        bytes memory k = bytes(key);
        int256 startIdx = indexOf(src, k);
        require(startIdx >= 0, "URL key not found");

        uint256 valueStart = uint256(startIdx) + k.length;
        uint256 valueEnd = valueStart;

        // Collect characters until quote, slash, or string end
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

        uint256 idx = uint256(startIdx) + k.length;

        // Advance until numerical digit starts
        while (idx < src.length && (src[idx] < '0' || src[idx] > '9')) {
            idx++;
        }

        uint256 result = 0;
        while (idx < src.length && src[idx] >= '0' && src[idx] <= '9') {
            result = result * 10 + (uint8(src[idx]) - 48);
            idx++;
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