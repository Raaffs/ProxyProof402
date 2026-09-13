const {
  Client,
  PrivateKey,
  AccountId,
} = require('@hashgraph/sdk');
const { ethers } = require('ethers');

// Deployed Smart Contract Address
const CONTRACT_ADDRESS = "0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1";

// Target Private Key to derive EVM Address
const TARGET_PRIVATE_KEY = "0x1faa6a20652e2c0bc8bebdbc016d05e0074146d6eb0a73ed7ab2b158add0e593";

// Targeted Contract ABI
const abi = [
  "function agents(uint256) view returns (address operationalKey, string tokenURI, string thirdpartyEndpoint, uint128 rate)",
  "function verifyAgentKey(uint256 tokenId, address keyToVerify) view returns (bool isAuthorized, address owner)",
  "function setThirdpartyEndpoint(uint256 tokenId, string newThirdpartyEndpoint) external"
];

async function main() {
  // --- Derive EVM Address from target private key ---
  const targetWallet = new ethers.Wallet(TARGET_PRIVATE_KEY);
  const derivedAddress = targetWallet.address;

  // --- 1. SENDER / SCRIPT RUNNER SETUP ---
  const senderId = AccountId.fromString('0.0.10388575');
  const senderPrivateKeyHex = '0x96d1691d02ea5732baba986d4169cc1060bdf88da2515d739c54fe2cdcbfe69d';
  
  // Hedera Client
  const senderHederaKey = PrivateKey.fromStringECDSA(senderPrivateKeyHex);
  const client = Client.forTestnet().setOperator(senderId, senderHederaKey);

  // Ethers Signer (using Hedera Testnet JSON-RPC)
  const provider = new ethers.JsonRpcProvider("https://testnet.hashio.io/api");
  const signer = new ethers.Wallet(senderPrivateKeyHex, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);

  console.log(`Running script with account: ${senderId.toString()} (${signer.address})`);
  console.log(`Derived Target Key Address : ${derivedAddress}\n`);

  // --- 2. ITERATE FROM TOKEN ID 1 TO 20 ---
  for (let tokenId = 1; tokenId <= 20; tokenId++) {
    console.log(`================ Token ID: ${tokenId} ================`);
    try {
      const agent = await contract.agents(tokenId);
      
      // Check if the agent actually exists (operationalKey is non-zero)
      if (agent.operationalKey === ethers.ZeroAddress) {
        console.log("Status: Unregistered / Empty\n");
        continue;
      }

      console.log("Operational Key    :", agent.operationalKey);
      console.log("Token URI          :", agent.tokenURI);
      console.log("Thirdparty Endpoint:", agent.thirdpartyEndpoint);
      console.log("Rate               :", agent.rate.toString());

      // Verify key against the derived address
      const [isAuthorized, owner] = await contract.verifyAgentKey(tokenId, derivedAddress);
      console.log("Is Target Authorized:", isAuthorized);
      console.log("Owner               :", owner);
      
      console.log("");
    } catch (err) {
      console.error(`Error querying Token ID ${tokenId}:`, err.message, "\n");
    }
  }

  client.close();
}

main().catch(console.error);