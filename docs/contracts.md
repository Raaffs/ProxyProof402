# Smart Contracts Specification & Interaction Overview

The **ProxyProof402** smart contract suite is deployed on the **Hedera EVM Testnet (Chain ID 296)**. It establishes an ERC-8004 based NFT identity registry for AI agents, a proof-of-humanity registry for owners, an on-chain zkTLS verification engine, and a reputation slashing system.

---

## Deployed Contract Addresses

| Contract | File Name | Address |
| :--- | :--- | :--- |
| **`AgentUsageValidator`** | `validation_registry.sol` | `0x2f5c713bb70DBCD6fa63B3c5afEB0fDC3239cD46` |
| **`Reputation`** | `reputation_registry.sol` | `0x5aa4bdb31669C0806d5E64C46baA3B05F0D23020` |
| **`AgentIdentityRegistry`**| `agent_registry.sol` | `0x6D0e102f25391Cd2778839a80E90c8C88FC0B2F1` |
| **`HumanRegistry`** | `human_registry.sol` | `0xCdeF3585ed95BB3907928034Ff3A4A723485BEFe` |

---

## Detailed Contract Architecture

### 1. `HumanRegistry` (`contracts/src/human_registry.sol`)
- **Purpose**: Sybil-resistant proof-of-humanity tracker.
- **Key Methods**:
  - `registerHuman()`: Registers `msg.sender` as a human.
  - `isHuman(address account)`: View function returning boolean status.

### 2. `AgentIdentityRegistry` (`contracts/src/agent_registry.sol`)
- **Purpose**: ERC-721 NFT contract ("ERC8004 Agent Identity") representing AI agent ownership.
- **Key Methods**:
  - `registerAgent(operationalKey, uri, thirdpartyEndpoint, signature, tinyHbarRate)`: Mints an agent NFT to `msg.sender`. Verifies caller is a registered human in `HumanRegistry` and validates the operational key ECDSA signature over `keccak256(msg.sender, uri, thirdpartyEndpoint)`.
  - `setOperationalKey(tokenId, newOperationalKey, signature)`: Updates operational key with approval signature.
  - `verifyAgentKey(tokenId, keyToVerify)`: Verifies if `keyToVerify` matches the agent's active operational key.

### 3. `Reputation` (`contracts/src/reputation_registry.sol`)
- **Purpose**: Tracks trust points for AI agents (default baseline score: 50).
- **Key Methods**:
  - `deductAndTransferPoint(agentId, client)`: Callable **only** by `AgentUsageValidator`. Deducts 1 trust point from the agent and awards 1 trust point to the client (`clientTrustPoints`).
  - `payAgentWithPoints(receivingAgentId, pointsAmount)`: Allows clients to spend earned trust points to hire or boost another agent.

### 4. `AgentUsageValidator` (`contracts/src/validation_registry.sol`)
- **Purpose**: On-chain verification engine integrating Reclaim Protocol Solidity SDK (`Reclaim.sol`).
- **Key Methods**:
  - `validateUsage(tokenId, agentSignature, proof)`:
    1. Recovers operational address from `agentSignature` on `tokenId`.
    2. Queries `agentRegistry.verifyAgentKey` to confirm operational authorization.
    3. Calls `Reclaim(reclaimAddress).verifyProof(proof)` to cryptographically verify witness signatures.
    4. Extracts actual URL from `proof.claimInfo.parameters` and compares against `agentRegistry.getAgentThirdPartyEndpoint(tokenId)`.
    5. If endpoint mismatch is detected, triggers `reputationContract.deductAndTransferPoint(tokenId, msg.sender)` and sets `slashed = true`.

---

## PlantUML Interaction Diagram

```plantuml
@startuml Contracts_Interaction
skinparam sequenceMessageAlign center

actor "Human Owner" as Owner
actor "Client Account" as Client
participant "HumanRegistry" as HR
participant "AgentIdentityRegistry" as AIR
participant "AgentUsageValidator" as AUV
participant "Reclaim Verifier SDK" as Reclaim
participant "Reputation" as Rep

== 1. Human & Agent Registration ==
Owner -> HR: registerHuman()
HR --> Owner: Registered (isHuman = true)

Owner -> AIR: registerAgent(operationalKey, uri, thirdpartyEndpoint, signature, rate)
AIR -> HR: isHuman(msg.sender)
HR --> AIR: true
AIR -> AIR: Verify operationalKey signature on keccak256(msg.sender, uri, thirdpartyEndpoint)
AIR -> AIR: Mint ERC-721 Token NFT & store Agent struct
AIR --> Owner: tokenId minted

== 2. Usage Validation & Slashing ==
Client -> AUV: validateUsage(tokenId, agentSignature, proof)
AUV -> AIR: verifyAgentKey(tokenId, recoveredAgentKey)
AIR --> AUV: (isAuthorized = true, owner)

AUV -> Reclaim: verifyProof(proof)
Reclaim --> AUV: Proof Cryptographically Valid

AUV -> AIR: getAgentThirdPartyEndpoint(tokenId)
AIR --> AUV: expectedUrl

AUV -> AUV: Extract actualUrl from proof.claimInfo.parameters
alt actualUrl != expectedUrl (Fraud Detected)
    AUV -> Rep: deductAndTransferPoint(tokenId, client)
    Rep -> AIR: ownerOf(tokenId)
    AIR --> Rep: owner
    Rep -> Rep: Deduct 1 point from Agent Score
    Rep -> Rep: Credit 1 point to Client Trust Points
    Rep --> AUV: Slashed & Points Transferred
end
AUV --> Client: (actualTokensUsed, slashed)

== 3. Client Trust Point Redemption ==
Client -> Rep: payAgentWithPoints(receivingAgentId, pointsAmount)
Rep -> AIR: ownerOf(receivingAgentId)
AIR --> Rep: owner
Rep -> Rep: Deduct points from Client, add to Receiving Agent Score
Rep --> Client: Trust Points Redeemed
@enduml
```
