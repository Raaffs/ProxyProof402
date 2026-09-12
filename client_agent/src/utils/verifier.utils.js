const { ethers } = require('ethers');

function verifyProofOffline(proof) {
  const claimData = proof.claimData;

  if (!claimData || !proof.signatures || proof.signatures.length === 0) {
    return { isValid: false, signers: [] };
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

  const recoveredSigners = proof.signatures.map((sig) => {
    try {
      return ethers.verifyMessage(ethers.getBytes(messageHash), sig);
    } catch {
      return ethers.recoverAddress(messageHash, sig);
    }
  });

  return {
    isValid: recoveredSigners.length > 0 && recoveredSigners.every((s) => !!s),
    signers: recoveredSigners,
  };
}

module.exports = { verifyProofOffline };