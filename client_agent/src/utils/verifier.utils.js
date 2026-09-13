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
 * Validates the zkTLS claim signature against the reconstructed canonical message.
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
        const parsedContext = typeof proof.claimData.context === 'string'
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

module.exports = {
  verifyProofOffline,
  extractGeminiMetrics,
  verifyRefundAccounting,
  unwrapProof,
};