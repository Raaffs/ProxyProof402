# Hedera Hashgraph Integration Specification

This document details the architectural integration of **Hedera Hashgraph** within **ProxyProof402**, covering x402 micropayments, automated server overpayment refunds, zkTLS-backed financial accounting, dynamic HCS-26 agent discovery, and Hedera EVM smart contract enforcement.

---

## 1. System Overview & Hedera Core Services

ProxyProof402 utilizes Hedera Hashgraph across four fundamental layers:

| Hedera Service / Component | Layer Function | Code Reference |
| :--- | :--- | :--- |
| **Hedera Consensus Service (HCS)** | Decentralized HCS-26 Agent Discovery via Mirror Nodes | `client_agent/src/services/hcsDiscovery.service.js` |
| **Hedera Token/HBAR Transfers** | x402 Micropayment Headers & Automated Refunds | `server_agent/src/services/hedera.service.js` & `client_agent/src/services/hederaPayment.service.js` |
| **x402 Facilitator Protocol** | HBAR Micropayment Challenge Settlement (`hedera:testnet`) | `server_agent/src/services/facilitator.service.js` |
| **Hedera EVM (Chain ID 296)** | ERC-8004 Agent NFT Identity, Reputation & Proof Validation | `contracts/src/*.sol` |

---

## 2. x402 Micropayments (x402 / Blocky402 Protocol)

ProxyProof402 implements the **x402 Protocol** (HTTP 402 Payment Required) for autonomous agent-to-agent service monetization on Hedera:

```
+--------------+        1. GET Prompt Request         +--------------+
|              |------------------------------------->|              |
|              |<-------------------------------------|              |
|              |   2. HTTP 402 Payment Required       |              |
|              |      (Payee, Rate, Network)          |              |
| Client Agent |                                      | Server Agent |
| (client_agent|        3. GET Request with           |(server_agent)|
|              |           Base64 X-PAYMENT           |              |
|              |------------------------------------->|              |
|              |                                      |      |       |
+--------------+                                      +------+-------+
                                                             |
                                           4. POST /settle   v
                                                     +---------------+
                                                     |  x402         |
                                                     |  Facilitator  |
                                                     +---------------+
```

1. **402 Challenge**: When a client requests prompt execution without an `X-PAYMENT` header, `AgentController` sends back HTTP `402 Payment Required`:
   ```json
   {
     "x402Version": 2,
     "error": "Payment Required",
     "accepts": [{
       "scheme": "exact",
       "network": "hedera:testnet",
       "amount": "100000",
       "payTo": "0.0.xxxxx",
       "asset": "0.0.0"
     }]
   }
   ```
2. **Transaction Signing (`hederaPayment.service.js`)**: The client constructs a frozen Hedera `TransferTransaction` transferring HBAR from the operator to the payee account, signs it with operator credentials via Hedera SDK, and attaches the base64-encoded payment payload in the `X-PAYMENT` header.
3. **Settlement (`facilitator.service.js`)**: The server agent submits the payment payload to the x402 facilitator (`POST /settle`), executing the HBAR payment transaction directly on Hedera Testnet.

---

## 3. Automated Server Overpayment Refunds

Because LLM API prompt completions have dynamic output lengths, clients may deposit buffer tinybars up-front. The server agent automatically computes exact consumption and refunds unused tinybars back to the client:

### Refund Calculation Logic (`server_agent/src/services/hedera.service.js`)

1. Extract total tokens (`totalTokenCount`) from the verified zkTLS response.
2. Compute actual tinybar cost:
   $$\text{Actual Cost Tinybars} = \text{totalTokenCount} \times \text{tokenRateTinybars}$$
3. Calculate refund amount:
   $$\text{Refund Tinybars} = \text{Paid Tinybars} - \text{Actual Cost Tinybars}$$
4. If $\text{Paid Tinybars} > \text{Actual Cost Tinybars}$, `HederaService` executes an automated Hedera SDK `TransferTransaction`:
   ```javascript
   const tx = await new TransferTransaction()
     .addHbarTransfer(signerAccountId, Hbar.fromTinybars(-refundAmountTinybars))
     .addHbarTransfer(payerAccountId, Hbar.fromTinybars(refundAmountTinybars))
     .execute(client);
   ```

---

## 4. Role of zkTLS

- **Private Key Security**: Secret headers (`x-goog-api-key`) are redacted from the generated proof.
- **Payload & Metric Proof**: The prompt body and LLM output tokens are included in public parameters.
- **Financial Accounting Anchor**: The extracted token count (`totalTokenCount`) inside the zkTLS proof serves as the immutable data anchor for calculating actual costs and verifying the server's refund math (`verifyRefundAccounting`).
- **On-Chain Fraud Proof**: Submitted to `AgentUsageValidator.sol` on Hedera EVM to verify third-party URL parameters and trigger reputation slashing if endpoint tampering occurs.

---

## 5. Dynamic HCS-26 Agent Discovery & Skills

The Client Agent dynamically discovers available AI service provider agents on Hedera Consensus Service (HCS) without relying on centralized API registries:

### HCS Topic Architecture (`client_agent/src/services/hcsDiscovery.service.js`)

- **Topic ID**: Queries messages from Hedera Mirror Node topic `0.0.10402297` (`/api/v1/topics/0.0.10402297/messages`).
- **HCS-26 Schema Mapping**: Parses base64 JSON payload fields:
  - `agentId` / `account_id`: Hedera Account ID identity.
  - `name`: Agent display name.
  - `capabilities` / `tags`: Agent skill tags (e.g., `["gemini", "llm", "chat", "reasoning"]`).
  - `endpoint`: Target HTTP API URL for x402 requests.
  - `rateTinybars`: Base rate per token (e.g., `1000` tinybars/token).
  - `score`: Initial trust score.
- **Consensus Sequence Ordering**: Maintains the latest registration update per agent based on Hedera consensus timestamps and message sequence numbers.

---

## 6. Hedera EVM Smart Contracts (Chain ID 296)

Deployed contracts enforce identity, human ownership verification, and reputation slashing:

| Contract | Address | Purpose |
| :--- | :--- | :--- |
| **`AgentUsageValidator`** | `0x2f5c713bb70DBCD6fa63B3c5afEB0fDC3239cD46` | Verifies zkTLS proofs on-chain & triggers slashing |
| **`Reputation`** | `0x5aa4bdb31669C0806d5E64C46baA3B05F0D23020` | Tracks agent trust scores & handles slashing point transfers |
| **`AgentIdentityRegistry`** | `0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1` | ERC-8004 NFT Agent Identity Registry |
| **`HumanRegistry`** | `0xCdeF3585ed95BB3907928034Ff3A4A723485BEFe` | Proof-of-Humanity Registry for agent owners |

---

## 7. Hedera Integration Architecture Diagram

```mermaid
graph TD
    subgraph DiscoveryLayer ["1. Discovery Layer (HCS)"]
        HCS["Hedera Consensus Topic<br/>(Topic ID: 0.0.10402297)"]
        Mirror["Hedera Mirror Node<br/>(REST API HCS-26 Messages)"]
    end

    subgraph PaymentLayer ["2. Micropayment & Refund Layer (HBAR)"]
        ClientPayment["Client Payment Signer<br/>(TransferTransaction Header)"]
        Facilitator["x402 Facilitator<br/>(Settles on hedera:testnet)"]
        ServerRefund["Server Refund Engine<br/>(Automated HBAR Transfer)"]
    end

    subgraph EVMLayer ["3. Smart Contract Layer (Hedera EVM Chain 296)"]
        AIR["AgentIdentityRegistry.sol<br/>(ERC-8004 NFT)"]
        AUV["AgentUsageValidator.sol<br/>(zkTLS Solidity SDK)"]
        Rep["Reputation.sol<br/>(Trust Scores & Slashing)"]
    end

    Client["Client Agent"] -->|Query Agents| Mirror
    Mirror -->|Return HCS-26 Cards| Client
    HCS -->|Broadcast Messages| Mirror

    Client -->|Generate Signed X-PAYMENT| ClientPayment
    ClientPayment -->|Send Payload| Facilitator
    Facilitator -->|Settle HBAR Payment| ServerRefund

    ServerRefund -->|Return Excess HBAR| Client

    Client -->|validateUsage(tokenId, sig, proof)| AUV
    AUV -->|Verify Key & Endpoint| AIR
    AUV -->|Slash Agent Score on Fraud| Rep
```
