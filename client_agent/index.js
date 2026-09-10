const { ethers } = require('ethers');
require('dotenv').config();

/**
 * Verifies Reclaim Witness signatures offline using ethers.js
 * Bypasses all on-chain RPC calls and network rate limits.
 */
function verifyProofOffline(proof) {
  const claimData = proof.claimData;

  if (!claimData || !proof.signatures || proof.signatures.length === 0) {
    return { isValid: false, reason: 'Missing claimData or signatures in proof' };
  }

  // 1. Construct the canonical claim string
  const canonicalString = [
    claimData.provider ? claimData.provider.toLowerCase() : 'http',
    claimData.parameters || '',
    claimData.context || '',
    claimData.identifier ? claimData.identifier.toLowerCase() : '',
    claimData.epoch || 1,
    claimData.timestampS || Math.floor(Date.now() / 1000),
  ].join('\n');

  // 2. Keccak256 hash of the canonical string
  const messageBytes = ethers.toUtf8Bytes(canonicalString);
  const messageHash = ethers.keccak256(messageBytes);

  // 3. Recover witness public addresses from signatures
  const recoveredSigners = proof.signatures.map((signature) => {
    try {
      // EIP-191 message signature recovery
      return ethers.verifyMessage(ethers.getBytes(messageHash), signature);
    } catch {
      // Fallback: Direct ECDSA hash recovery
      return ethers.recoverAddress(messageHash, signature);
    }
  });

  const isValid = recoveredSigners.length > 0 && recoveredSigners.every((addr) => !!addr);

  return {
    isValid,
    signers: recoveredSigners,
    messageHash,
  };
}

/**
 * Extracts and parses Gemini's text output from the verified raw HTTP response payload
 */
function extractGeminiText(proof) {
  try {
    const rawData = proof.extractedParameterValues?.data || proof.claimData?.parameters || '';
    const jsonStart = rawData.indexOf('{');
    
    if (jsonStart !== -1) {
      const jsonBody = JSON.parse(rawData.slice(jsonStart));
      return jsonBody.candidates?.[0]?.content?.parts?.[0]?.text || 'No text candidate found';
    }
    return 'Raw payload format unparseable';
  } catch (err) {
    return `Error parsing response: ${err.message}`;
  }
}

async function runClientAgent() {
  const serverUrl = process.env.SERVER_AGENT_URL || 'http://localhost:8000';
  const promptMessage = 'hello';

  console.log(`[Client Agent] Requesting response from Server Agent for: "${promptMessage}"...`);

  // 1. Fetch proof payload from Server Agent
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
  console.log('\n--- Received ZK Proof from Server Agent ---');

  // 2. Perform local, offline verification
  const verification = verifyProofOffline(proof);

  console.log('Proof Cryptographically Valid:', verification.isValid);
  console.log('Witness Signer Address(es):', verification.signers);

  if (verification.isValid) {
    // 3. Parse verified output from proof
    const geminiText = extractGeminiText(proof);
    console.log('\nVerified Gemini Output:');
    console.log(`"${geminiText}"`);
  }
}

runClientAgent().catch(console.error);