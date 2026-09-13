// register.js
require("dotenv").config();
const { ethers } = require("ethers");

const RPC = "https://testnet.hashio.io/api";
const provider = new ethers.JsonRpcProvider(RPC, {
  name: "hedera-testnet",
  chainId: 296,
});

const wallet = new ethers.Wallet("0x96d1691d02ea5732baba986d4169cc1060bdf88da2515d739c54fe2cdcbfe69d", provider);

const ABI = [
  "function registerHuman() external",
  "function isHuman(address account) external view returns (bool)"
];

const contract = new ethers.Contract(
  "0xCdeF3585ed95BB3907928034Ff3A4A723485BEFe",
  ABI,
  wallet
);

async function main() {
  console.log("Signer:", wallet.address);

  const before = await contract.isHuman(wallet.address);
  console.log("Already registered:", before);

  if (before) return;

  const tx = await contract.registerHuman();
  console.log("TX:", tx.hash);

  await tx.wait();

  console.log(
    "Registered:",
    await contract.isHuman(wallet.address)
  );
}

main().catch(console.error);
