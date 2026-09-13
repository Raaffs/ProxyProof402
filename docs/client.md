# Client Agent Architecture & Interaction Specification

The **Client Agent** (`client_agent/`) acts as an autonomous proxy and execution verifier on behalf of end users. It discovers active AI agents via Hedera Consensus Service (HCS), creates signed x402 payment headers, executes zkTLS API requests, verifies witness signatures offline, audits financial refund math, and triggers on-chain validation & slashing on Hedera EVM smart contracts.

---

## Core Client Agent Responsibilities

### 1. Dynamic Agent Discovery (`hcsDiscovery.service.js`)
- Queries Hedera Mirror Node topics (`0.0.10402297`) for agent registration messages adhering to the HCS-26 standard.
- Parses agent metadata, operational status, rates, and endpoint URIs to select the optimal agent for a prompt.

### 2. Autonomous Micropayment Authorization (`hederaPayment.service.js`)
- Catches HTTP `402 Payment Required` responses from server agents.
- Constructs frozen Hedera `TransferTransaction` payloads signed with operator credentials.
- Base64 encodes transaction payloads into `X-PAYMENT` headers (supporting overpayment simulations for testing refund logic).

### 3. Offline Witness Verification (`verifier.utils.js`)
- Unwraps nested proof objects (`unwrapProof`).
- Reconstructs canonical claim byte strings from claim metadata.
- Recovers witness addresses offline using Ethers.js ECDSA message verification without incurring gas costs.

### 4. Financial Refund Accounting Audit (`verifier.utils.js`)
- Extracts `totalTokenCount` from HTTP body buffers contained within the zkTLS proof.
- Verifies that:
  $$\text{Expected Actual Cost} = \text{totalTokens} \times \text{tokenRateTinybars}$$
- Verifies reported vs expected refund amounts and transaction status.

### 5. On-Chain Validation & Slashing Interactivity (`verifier.utils.js`)
- Transforms JavaScript zkTLS proof objects into Solidity-compatible `Reclaim.Proof` struct format (`transformProofForSolidity`).
- Invokes `validateUsage(tokenId, agentSignature, proof)` on `AgentUsageValidator.sol` on Hedera EVM testnet.
- Triggers automatic trust score slashing on `Reputation.sol` if endpoint tampering or fraudulent execution is detected.

---

## PlantUML Client Interaction Diagram

```plantuml
@startuml Client_Agent_Interaction
skinparam sequenceMessageAlign center

actor "User / Frontend" as User
participant "Client Agent Service" as ClientService
participant "HCS Discovery Service" as HCSDiscovery
participant "Hedera Mirror Node" as MirrorNode
participant "Hedera Payment Service" as PaymentService
participant "Server Agent" as ServerAgent
participant "Offline Verifier Utils" as VerifierUtils
participant "AgentUsageValidator\n(Hedera EVM)" as ValidatorContract

== 1. Discovery Phase ==
User -> ClientService: Submit Prompt ("hello")
ClientService -> HCSDiscovery: fetchHcsAgentCards()
HCSDiscovery -> MirrorNode: GET /api/v1/topics/0.0.10402297/messages
MirrorNode --> HCSDiscovery: HCS-26 Message Stream
HCSDiscovery --> ClientService: Selected Agent Card (Endpoint, Rate)

== 2. Payment & zkTLS Request Phase ==
ClientService -> ServerAgent: GET /api/protected/verified/gemini?prompt=hello
ServerAgent --> ClientService: HTTP 402 Payment Required
ClientService -> PaymentService: createSignedPaymentHeader(requirement, overpayment)
PaymentService --> ClientService: X-PAYMENT Base64 Header Payload

ClientService -> ServerAgent: zkFetch GET (with X-PAYMENT Header)
ServerAgent --> ClientService: Response Payload (output, zkProof, signature, refundDetails)

== 3. Offline Cryptographic Verification & Financial Audit Phase ==
ClientService -> VerifierUtils: unwrapProof(zkProof)
VerifierUtils --> ClientService: Unwrapped Proof
ClientService -> VerifierUtils: verifyProofOffline(proof)
VerifierUtils -> VerifierUtils: Reconstruct canonical string & verify witness signatures
VerifierUtils --> ClientService: (isValid = true, signers)

ClientService -> VerifierUtils: verifyRefundAccounting(metrics, refundDetails, paidTinybars)
VerifierUtils --> ClientService: Audit Result (isMathCorrect = true, checks)

== 4. On-Chain Validation & Slashing Phase ==
ClientService -> VerifierUtils: transformProofForSolidity(zkProof)
VerifierUtils --> ClientService: Formatted Reclaim.Proof Tuple Struct
ClientService -> ValidatorContract: validateUsage(tokenId, agentSignature, formattedProof)
ValidatorContract -> ValidatorContract: Cryptographic Witness Check & Endpoint Comparison
alt Fraud / Mismatch Detected
    ValidatorContract -> ValidatorContract: Slash Agent Trust Score on Reputation Contract
end
ValidatorContract --> ClientService: Transaction Receipt (actualTokensUsed, slashed)
ClientService --> User: Stream Verified Response & Audit Summary
@enduml
```
