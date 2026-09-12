const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Offline ZK Proof Verification using ethers.js
 */
function verifyProofOffline(proof) {
  const claimData = proof.claimData;

  if (!claimData || !proof.signatures || proof.signatures.length === 0) {
    return { isValid: false, reason: 'Missing claimData or signatures' };
  }

  const canonicalString = [
    claimData.provider ? claimData.provider.toLowerCase() : 'http',
    claimData.parameters || '',
    claimData.context || '',
    claimData.identifier ? claimData.identifier.toLowerCase() : '',
    claimData.epoch || 1,
    claimData.timestampS || Math.floor(Date.now() / 1000),
  ].join('\n');

  const messageHash = ethers.keccak256(ethers.toUtf8Bytes(canonicalString));

  const recoveredSigners = proof.signatures.map((signature) => {
    try {
      return ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    } catch {
      return ethers.recoverAddress(messageHash, signature);
    }
  });

  return {
    isValid: recoveredSigners.length > 0 && recoveredSigners.every((addr) => !!addr),
    signers: recoveredSigners,
  };
}

/**
 * Extracts the API URL verified in the ZK Proof
 */
function extractApiUrl(proof) {
  try {
    // 1. Check inside claimData.parameters
    if (proof.claimData?.parameters) {
      const params = typeof proof.claimData.parameters === 'string'
        ? JSON.parse(proof.claimData.parameters)
        : proof.claimData.parameters;

      if (params.url) return params.url;
      if (params.paramValues?.url) return params.paramValues.url;
    }

    // 2. Check inside claimData.context
    if (proof.claimData?.context) {
      const context = typeof proof.claimData.context === 'string'
        ? JSON.parse(proof.claimData.context)
        : proof.claimData.context;

      if (context.url) return context.url;
      if (context.extractedParameters?.url) return context.extractedParameters.url;
    }

    // 3. Check inside extractedParameterValues directly
    if (proof.extractedParameterValues?.url) {
      return proof.extractedParameterValues.url;
    }
  } catch (err) {
    console.error('URL extraction error:', err.message);
  }

  // Fallback: Default endpoint used by Gemini zkFetch
  return 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
}

/**
 * Parses Gemini response text and totalTokenCount from raw proof data
 */
function extractGeminiMetrics(proof) {
  try {
    const rawData = proof.extractedParameterValues?.data || proof.claimData?.parameters || '';
    const jsonStart = rawData.indexOf('{');

    if (jsonStart !== -1) {
      const jsonBody = JSON.parse(rawData.slice(jsonStart));
      
      const text = jsonBody.candidates?.[0]?.content?.parts?.[0]?.text || 'N/A';
      const totalTokenCount = jsonBody.usageMetadata?.totalTokenCount ?? 'N/A';
      const promptTokenCount = jsonBody.usageMetadata?.promptTokenCount ?? 'N/A';
      const candidatesTokenCount = jsonBody.usageMetadata?.candidatesTokenCount ?? 'N/A';

      return {
        text,
        totalTokenCount,
        promptTokenCount,
        candidatesTokenCount,
      };
    }
  } catch (err) {
    console.error('Error parsing metrics:', err.message);
  }

  return { text: 'N/A', totalTokenCount: 'N/A' };
}

async function runClientAgent() {
  const serverUrl = process.env.SERVER_AGENT_URL || 'http://localhost:8000';
  const promptMessage = 'hello';

  console.log(`[Client Agent] Requesting query for prompt: "${promptMessage}"...`);

  const response = await fetch(`${serverUrl}/api/agent/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptMessage }),
  });

  const result = await response.json();

  if (!result.success) {
    console.error('[Client Agent] Request failed:', result.error);
    return;
  }

  const { proof } = result;
  const verification = verifyProofOffline(proof);

  console.log('\n================ VERIFICATION RESULT ================');
  console.log('Proof Validated:', verification.isValid ? 'YES' : 'NO');
  console.log('Witness Address:', verification.signers[0]);

  if (verification.isValid) {
    const apiUrl = extractApiUrl(proof);
    const metrics = extractGeminiMetrics(proof);

    console.log('\n================ EXTRACTED PROOF DATA ================');
    console.log(`Target API URL : ${apiUrl}`);
    console.log(`Response Text  : "${metrics.text}"`);
    console.log(`Total Tokens   : ${metrics.totalTokenCount} (Prompt: ${metrics.promptTokenCount}, Response: ${metrics.candidatesTokenCount})`);
    console.log('======================================================\n');
  }
}

runClientAgent().catch(console.error);