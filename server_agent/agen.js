require("dotenv").config();
const { ethers } = require("ethers");

const RPC = "https://testnet.hashio.io/api";
const provider = new ethers.JsonRpcProvider(RPC, {
  name: "hedera-testnet",
  chainId: 296,
});

const owner = new ethers.Wallet("0x96d1691d02ea5732baba986d4169cc1060bdf88da2515d739c54fe2cdcbfe69d", provider);
const operationalKey = new ethers.Wallet(
  "0x4f8a3c719e2b5d061c8a9f3e4b7d2e051c8f4a7b9e3d2c1b0a9f8e7d6c5b4a3f",
  provider
);

const ABI = [
  "function registerAgent(address operationalKey,string uri,string thirdpartyEndpoint,bytes signature,uint128 tinyHbarRate) external returns (uint256)",
];

const agentRegistry = new ethers.Contract(
  "0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1",
  ABI,
  owner
);

async function main() {
  console.log("Owner:", owner.address);
  console.log("Operational key:", operationalKey.address);

  const uri = "https://example.com/agent.json";
  const thirdpartyEndpoint = "https://example.com/api";
  const tinyHbarRate = 1000000;

  // 1. Pack variables identically to Solidity's abi.encodePacked(msg.sender, uri, thirdpartyEndpoint)
  const packedData = ethers.solidityPacked(
    ["address", "string", "string"],
    [owner.address, uri, thirdpartyEndpoint]
  );

  // 2. Hash the packed data -> bytes32
  const messageHash = ethers.keccak256(packedData);

  // 3. Sign the 32-byte hash array (signMessage auto-applies \x19Ethereum Signed Message:\n32)
  const signature = await operationalKey.signMessage(ethers.getBytes(messageHash));

  // 4. Verify locally matching OpenZeppelin's logic
  const recoveredAddress = ethers.verifyMessage(ethers.getBytes(messageHash), signature);
  console.log("Recovered Address:", recoveredAddress);
  console.log("Match:", recoveredAddress.toLowerCase() === operationalKey.address.toLowerCase());

  // 5. Submit Transaction
  const tx = await agentRegistry.registerAgent(
    operationalKey.address,
    uri,
    thirdpartyEndpoint,
    signature,
    tinyHbarRate
  );

  console.log("TX Hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Confirmed in Block:", receipt.blockNumber);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});