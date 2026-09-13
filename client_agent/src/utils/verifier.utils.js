const { ethers } = require('ethers');

/**
 * Recursively parses JSON strings if needed, unwrapping nested zkProof objects.
 */
function unwrapProof(inputProof) {
  let proof = inputProof;

  // If it's a JSON string, attempt to parse it recursively
  while (typeof proof === 'string') {
    try {
      proof = JSON.parse(proof);
    } catch (_) {
      break;
    }
  }

  // Handle nested inner zkProof object wrappers
  if (proof && proof.zkProof) {
    return unwrapProof(proof.zkProof);
  }

  return proof;
}

/**
 * Validates the zkTLS claim signature offline against the reconstructed canonical message.
 */
function verifyProofOffline(rawProof) {
  const proof = unwrapProof(rawProof);
  if (!proof || !proof.claimData || !proof.signatures || proof.signatures.length === 0) {
    return { isValid: false, signers: [], error: 'Missing claimData or signatures' };
  }

  const claimData = proof.claimData;

  const canonicalString = [
    claimData.provider ? claimData.provider.toLowerCase() : 'http',
    claimData.parameters || '',
    claimData.context || '',
    claimData.identifier ? claimData.identifier.toLowerCase() : '',
    claimData.epoch || 1,
    claimData.timestampS || Math.floor(Date.now() / 1000),
  ].join('\n');

  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalString));

  const recoveredSigners = proof.signatures.map((sig) => {
    try {
      return ethers.verifyMessage(ethers.getBytes(messageHash), sig);
    } catch (_) {
      try {
        return ethers.recoverAddress(messageHash, sig);
      } catch (err) {
        return null;
      }
    }
  });

  const validSigners = recoveredSigners.filter((s) => !!s);
  return {
    isValid: validSigners.length > 0 && validSigners.length === proof.signatures.length,
    signers: validSigners,
  };
}

/**
 * Extracts output text and total token count across all payload variants.
 */
function extractGeminiMetrics(rawProof) {
  const proof = unwrapProof(rawProof) || rawProof;

  let text = 'N/A';
  let totalTokenCount = 0;

  try {
    // 1. Check direct raw parameter strings from Reclaim output
    let rawData =
      proof?.extractedParameterValues?.data ||
      proof?.claimData?.parameters ||
      '';

    // 2. Fallback to context extracted parameters
    if (!rawData && proof?.claimData?.context) {
      try {
        const parsedContext =
          typeof proof.claimData.context === 'string'
            ? JSON.parse(proof.claimData.context)
            : proof.claimData.context;
        rawData = parsedContext?.extractedParameters?.data || '';
      } catch (_) {}
    }

    // 3. Attempt parsing raw HTTP payload body
    if (rawData && typeof rawData === 'string') {
      const headerEndIndex = rawData.indexOf('\r\n\r\n');
      const searchString = headerEndIndex !== -1 ? rawData.slice(headerEndIndex + 4) : rawData;
      const jsonStart = searchString.indexOf('{');

      if (jsonStart !== -1) {
        const jsonBody = JSON.parse(searchString.slice(jsonStart));

        // Format A: Direct Express Wrapper response ({ output: "...", tokensUsed: 199 })
        if (jsonBody.output) {
          text = jsonBody.output;
        }
        // Format B: Direct Gemini API payload response
        else if (jsonBody.candidates?.[0]?.content?.parts?.[0]?.text) {
          text = jsonBody.candidates[0].content.parts[0].text;
        }

        // Token count extraction
        if (jsonBody.tokensUsed !== undefined) {
          totalTokenCount = Number(jsonBody.tokensUsed);
        } else if (jsonBody.usageMetadata?.totalTokenCount !== undefined) {
          totalTokenCount = Number(jsonBody.usageMetadata.totalTokenCount);
        }
      }
    }
  } catch (err) {
    console.error('[Verifier] Metric Extraction Error:', err.message);
  }

  return { text, totalTokenCount };
}

/**
 * Audits accounting refund mathematics using extracted metrics.
 */
function verifyRefundAccounting({
  zkProof,
  refundDetails,
  paidTinybars,
  tokenRateTinybars = 1000,
}) {
  const { totalTokenCount } = extractGeminiMetrics(zkProof);

  const paid = BigInt(paidTinybars);
  const rate = BigInt(tokenRateTinybars);
  const tokens = BigInt(totalTokenCount);

  const expectedActualCost = tokens * rate;
  const expectedRefundAmount = paid > expectedActualCost ? paid - expectedActualCost : 0n;

  const reportedActualCost = BigInt(refundDetails?.actualCostTinybars || 0);
  const reportedRefundAmount = BigInt(refundDetails?.refundAmountTinybars || 0);

  const isCostValid = reportedActualCost === expectedActualCost;
  const isRefundAmountValid = reportedRefundAmount === expectedRefundAmount;
  const isRefundStateValid = paid > expectedActualCost ? refundDetails?.refunded === true : true;

  const isMathCorrect = isCostValid && isRefundAmountValid && isRefundStateValid;

  return {
    isMathCorrect,
    totalTokenCount,
    paidTinybars: paid.toString(),
    expectedActualCost: expectedActualCost.toString(),
    reportedActualCost: reportedActualCost.toString(),
    expectedRefundAmount: expectedRefundAmount.toString(),
    reportedRefundAmount: reportedRefundAmount.toString(),
    checks: {
      isCostValid,
      isRefundAmountValid,
      isRefundStateValid,
    },
  };
}

/**
 * Transforms JS Reclaim zkProof object into Solidity-compatible Reclaim.Proof struct layout.
 */
function transformProofForSolidity(rawProof) {
  const proof = unwrapProof(rawProof);
  const claimData = proof.claimData || {};

  return {
    claimInfo: {
      provider: claimData.provider || 'http',
      parameters: claimData.parameters || '',
      context: claimData.context || '',
    },
    signedClaim: {
      claim: {
        identifier:
          claimData.identifier ||
          proof.identifier ||
          '0x0000000000000000000000000000000000000000000000000000000000000000',
        owner: claimData.owner || '0x0000000000000000000000000000000000000000',
        timestampS: Number(claimData.timestampS || Math.floor(Date.now() / 1000)),
        epoch: Number(claimData.epoch || 1),
      },
      signatures: proof.signatures || [],
    },
  };
}

/**
 * Complete Ethers ABI definition matching AgentUsageValidator.sol
 */
const AGENT_USAGE_VALIDATOR_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'tokenId', type: 'uint256' },
      { internalType: 'bytes', name: 'agentSignature', type: 'bytes' },
      {
        components: [
          {
            components: [
              { internalType: 'string', name: 'provider', type: 'string' },
              { internalType: 'string', name: 'parameters', type: 'string' },
              { internalType: 'string', name: 'context', type: 'string' },
            ],
            internalType: 'struct Reclaim.ClaimInfo',
            name: 'claimInfo',
            type: 'tuple',
          },
          {
            components: [
              {
                components: [
                  { internalType: 'bytes32', name: 'identifier', type: 'bytes32' },
                  { internalType: 'address', name: 'owner', type: 'address' },
                  { internalType: 'uint32', name: 'timestampS', type: 'uint32' },
                  { internalType: 'uint32', name: 'epoch', type: 'uint32' },
                ],
                internalType: 'struct Reclaim.CompleteClaimData',
                name: 'claim',
                type: 'tuple',
              },
              { internalType: 'bytes[]', name: 'signatures', type: 'bytes[]' },
            ],
            internalType: 'struct Reclaim.SignedClaim',
            name: 'signedClaim',
            type: 'tuple',
          },
        ],
        internalType: 'struct Reclaim.Proof',
        name: 'proof',
        type: 'tuple',
      },
    ],
    name: 'validateUsage',
    outputs: [
      { internalType: 'uint256', name: 'actualTokensUsed', type: 'uint256' },
      { internalType: 'bool', name: 'slashed', type: 'bool' },
    ],
    stateMutability: 'nonpayable',
    type: 'function',
  },
];

/**
 * Triggers validateUsage on AgentUsageValidator.sol via smart contract execution.
 */
async function triggerOnChainValidation({ contractAddress, signer, responseData }) {
  const contract = new ethers.Contract(contractAddress, AGENT_USAGE_VALIDATOR_ABI, signer);

  const tokenId = 15;
  const agentSignature = "0x75f0421c49f5eda6859f0a4a70b85e3aa5fdda6d19e71ac1ee50f227a24132390fe720cbd1a10131682e0a3a761e526ed740f4cd77c9b8956cb40bb22320f9701c";
  const formattedProof = transformProofForSolidity(responseData.zkProof);
  console.log("formatted proof: ",formattedProof)

  const tx = await contract.validateUsage(
    tokenId,
    agentSignature,
    formattedProof
  );

  const receipt = await tx.wait();
  return receipt;
}

module.exports = {
  unwrapProof,
  verifyProofOffline,
  extractGeminiMetrics,
  verifyRefundAccounting,
  transformProofForSolidity,
  triggerOnChainValidation,
  AGENT_USAGE_VALIDATOR_ABI,
};