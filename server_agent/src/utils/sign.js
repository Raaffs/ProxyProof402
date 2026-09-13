const { ethers } = require('ethers');

/**
 * Signs a uint256 tokenId to produce an ECDSA signature compatible with:
 * keccak256(abi.encodePacked(tokenId)) -> ECDSA.toEthSignedMessageHash
 */
async function signTokenId(tokenId, privateKeyHex) {
    const formattedKey = privateKeyHex.startsWith('0x') ? privateKeyHex : `0x${privateKeyHex}`;
    const wallet = new ethers.Wallet(formattedKey);

    // Matches Solidity: keccak256(abi.encodePacked(tokenId))
    const messageHashBytes = ethers.solidityPackedKeccak256(["uint256"], [tokenId]);

    // wallet.signMessage automatically applies "\x19Ethereum Signed Message:\n32" prefix
    // matching ECDSA.toEthSignedMessageHash(messageHash)
    const signature = await wallet.signMessage(ethers.getBytes(messageHashBytes));
    return { signature, signerAddress: wallet.address };
}

module.exports = signTokenId