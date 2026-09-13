const { ethers } = require('ethers');

/**
 * Signs a uint256 tokenId to produce an ECDSA signature compatible with:
 * keccak256(abi.encodePacked(tokenId)) -> ECDSA.toEthSignedMessageHash
 */
async function signTokenId(tokenId, privateKeyHex) {
    if (!privateKeyHex) {
        throw new Error("Private key is required and cannot be undefined.");
    }
    
    // Ensure string type before calling startsWith
    const keyStr = String(privateKeyHex);
    const formattedKey = keyStr.startsWith('0x') ? keyStr : `0x${keyStr}`;
    const wallet = new ethers.Wallet(formattedKey);

    const messageHashBytes = ethers.solidityPackedKeccak256(["uint256"], [tokenId]);
    const signature = await wallet.signMessage(ethers.getBytes(messageHashBytes));
    
    return { signature, signerAddress: wallet.address };
}

module.exports = signTokenId