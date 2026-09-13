# ProxyProof402

**ProxyProof402 proves AI API providers’ usage, costs, and failures with zkTLS.**

ProxyProof402 is an end-to-end framework enabling autonomous AI agents to discover each other, negotiate and settle micropayments using the **x402 Protocol** (HTTP 402 Payment Required) on **Hedera Hashgraph**, execute commercial LLM requests verifiably via **Reclaim Protocol zkTLS**, and enforce cryptographic integrity and reputation through EVM smart contracts.

---

## 🌟 Key Features

1. **Autonomous x402 Micropayments**: Service interactions start with HTTP 402 Payment Required challenges. Clients attach pre-authorized, signed Hedera HBAR transaction headers (`X-PAYMENT`) settled near-instantaneously via an x402 facilitator.
2. **Zero-Knowledge TLS Proofs (zkTLS)**: Server agents query upstream LLMs (e.g., Google Gemini) using Reclaim Protocol `zkFetch`. Private API keys (`x-goog-api-key`) are redacted, while cryptographic proofs of HTTP payloads are returned to the client.
3. **Automatic Overpayment Refunds**: If a client overpays tinybars up-front, the server agent calculates the actual token usage cost (`totalTokens * tokenRateTinybars`) and automatically transfers a refund back to the client's Hedera account.
4. **Dynamic HCS Agent Discovery**: Agents publish their capability cards to Hedera Consensus Service (HCS) topics using the HCS-26 standard, enabling decentralized discovery without central API gateways.
5. **On-Chain Validator & Reputation Slashing**: Clients verify proofs offline for zero gas. In cases of endpoint mismatch or fraud, clients submit proofs to `AgentUsageValidator.sol` on Hedera EVM to trigger automatic slashing of the server agent's trust points on `Reputation.sol`.
6. **Sybil Resistance**: Human identity verification via `HumanRegistry.sol` (for agent NFT minting) and **World ID** zero-knowledge proof verification on the client agent.

---

## 📜 Deployed Smart Contracts (Hedera EVM Testnet - Chain ID 296)

All smart contracts are deployed on the Hedera EVM Testnet:

| Contract Name | Contract Description | Deployed Address |
| :--- | :--- | :--- |
| **`AgentUsageValidator`** | Validator Engine (`validation_registry.sol`) verifying zkTLS proofs on-chain and calling slashing | `0x2f5c713bb70DBCD6fa63B3c5afEB0fDC3239cD46` |
| **`Reputation`** | Trust Score Registry (`reputation_registry.sol`) tracking trust points & slashing fraud | `0x5aa4bdb31669C0806d5E64C46baA3B05F0D23020` |
| **`AgentIdentityRegistry`** | ERC-8004 NFT Agent Identity Registry (`agent_registry.sol`) linking operational keys & URIs | `0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1` |
| **`HumanRegistry`** | Proof of Humanity Registry (`human_registry.sol`) verifying human agent ownership | `0xCdeF3585ed95BB3907928034Ff3A4A723485BEFe` |

---

## 🏗️ Architecture Overview

```
                                +----------------------------------+
                                |  Hedera Consensus Service (HCS)  |
                                |     (Agent Discovery Topic)      |
                                +-----------------+----------------+
                                                  ^
                                                  | (1. Discover Agents via Mirror Node)
                                                  v
+-----------------------+     (2. Prompt Request)      +-----------------------+
|                       |----------------------------->|                       |
|                       |<-----------------------------|                       |
|                       |  (3. HTTP 402 Payment Req)   |                       |
|     Client Agent      |                              |     Server Agent      |
|    (client_agent)     |---(4. Signed X-PAYMENT)----->|    (server_agent)    |
|                       |                              |                       |
|                       |<--(6. AI Output + zkTLS)-----|                       |
+-----------+-----------+                              +-----------+-----------+
            |                                                      |
            | (5. Settle via Facilitator)                          | (7. Auto-Refund Overpayment)
            v                                                      v
+-----------------------+                              +-----------------------+
|    x402 Facilitator   |                              |  Hedera Hashgraph     |
|   (Hedera Testnet)    |                              |    (HBAR Transfer)    |
+-----------------------+                              +-----------------------+
            |
            | (8. Trigger On-Chain Validation & Slashing if fraudulent)
            v
+-------------------------------------------------------------------------------+
|                         Hedera EVM Smart Contracts                            |
|  +---------------------+   +---------------------+   +---------------------+  |
|  | AgentIdentityReg.   |   | AgentUsageValidator |   |  ReputationReg.     |  |
|  |  (ERC-8004 NFT)     |   |   (zkTLS Sol SDK)   |---| (Trust Score/Slash) |  |
|  +---------------------+   +---------------------+   +---------------------+  |
+-------------------------------------------------------------------------------+
```

---

## 📁 Repository Structure

```
ProxyProof402/
├── contracts/                        # Hedera EVM Solidity Smart Contracts (Foundry)
│   └── src/
│       ├── agent_registry.sol        # ERC-8004 NFT Identity Registry
│       ├── human_registry.sol        # Sybil-resistant Human Registry
│       ├── reputation_registry.sol   # Trust Score & Slashing Contract
│       └── validation_registry.sol   # On-Chain zkTLS Proof Validator Engine
├── server_agent/                     # AI Provider Server Node
│   └── src/
│       ├── controllers/
│       │   └── agent.controller.js   # 402 Challenge, settlement, & AI dispatch
│       ├── services/
│       │   ├── facilitator.service.js# x402 payment settlement client
│       │   ├── gemini.service.js     # zkTLS LLM query engine (Reclaim zkFetch)
│       │   └── hedera.service.js     # Overpayment refund processor
│       └── utils/
│           └── sign.js               # ECDSA operational key signer
├── client_agent/                     # AI Consumer Client Node
│   └── src/
│       ├── main.js                   # Client Express backend & SSE execution stream
│       ├── services/
│       │   ├── clientAgent.service.js# Core client execution & audit orchestrator
│       │   ├── hcsDiscovery.service.js# Hedera HCS agent discovery service
│       │   └── hederaPayment.service.js# Hedera x402 payment signer
│       └── utils/
│           └── verifier.utils.js     # Offline verifier & EVM transformer
└── frontend/                         # React / Vite Web Interface
    └── src/                          # Agent directory, execution console, & management
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Foundry / Forge** (optional, for contract development)
- **Hedera Testnet Account ID & Private Key** (ECDSA or ED25519)
- **Reclaim Protocol App ID & Secret**

### Environment Configuration

1. Create a `.env` file in `server_agent/`:
   ```env
   PORT=8000
   PAYEE_ACCOUNT_ID=0.0.xxxxx
   OPERATOR_PRIVATE_KEY=0x...
   GEMINI_API_KEY=AIzaSy...
   RECLAIM_APP_ID=0x...
   RECLAIM_APP_SECRET=0x...
   FACILITATOR_URL=https://x402-facilitator.testnet.hedera.com
   ```

2. Create a `.env` file in `client_agent/`:
   ```env
   PORT=5000
   OPERATOR_ID=0.0.xxxxx
   OPERATOR_KEY=0x...
   HCS_TOPIC_ID=0.0.10402297
   RECLAIM_APP_ID=0x...
   RECLAIM_APP_SECRET=0x...
   SERVER_AGENT_URL=http://localhost:8000
   HEDERA_RPC_URL=https://testnet.hashio.io/api
   EVM_PRIVATE_KEY=0x...
   ```

### Installation & Execution

#### 1. Start Server Agent
```bash
cd server_agent
npm install
npm start
```

#### 2. Start Client Agent
```bash
cd client_agent
npm install
npm start
```

#### 3. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```

---

## 🔒 Security & Verification Model

- **Private Key Security**: Upstream API keys are never exposed to clients or witness nodes.
- **Witness Signature Auditing**: Witness node signatures in zkTLS proofs are verified offline using standard ECDSA secp256k1 message recovery.
- **Refund Audit**: The client audits reported token counts against `totalTokenCount` extracted directly from HTTP payload buffers inside the proof.
- **On-Chain Enforcement**: Fraudulent behaviors cause permanent loss of reputation on `Reputation.sol`, ensuring strong cryptoeconomic incentives for honest service execution.

---

## 📄 License

MIT License. See [LICENSE](LICENSE) for details.
