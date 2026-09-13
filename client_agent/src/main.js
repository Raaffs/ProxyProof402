require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const config = require('./config/env.js'); 
const { signRequest } = require('@worldcoin/idkit-core/signing');
const { 
  Client, 
  PrivateKey, 
  TopicMessageSubmitTransaction, 
  AccountId, 
  AccountAliasAccountIdQuery 
} = require('@hashgraph/sdk');

// Import your services
const clientAgentService = require('./services/clientAgent.service.js');
const hcsDiscoveryService = require('./services/hcsDiscovery.service.js');

const app = express();
const PORT = process.env.PORT || 5000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

// -----------------------------------------------------------------------------
// HARDCODED WORLD ID CREDENTIALS FOR HACKATHON
// -----------------------------------------------------------------------------
const WORLD_RP_ID = process.env.WORLD_RP_ID || "rp_657c6d7076070f30";
const WORLD_RP_SIGNING_KEY = process.env.WORLD_RP_SIGNING_KEY || "0x68416775f6577022dfa364c480fa6c0ec8dd861a7939069e86de74e5fcd13b48";

app.use(cors());
app.use(express.json());

// Initialize Hedera SDK Client
const HEDERA_OPERATOR_ID = process.env.HEDERA_OPERATOR_ID || "0.0.10402297";
const HEDERA_OPERATOR_KEY = process.env.HEDERA_OPERATOR_KEY;

let hederaClient;
if (HEDERA_OPERATOR_ID && HEDERA_OPERATOR_KEY) {
  hederaClient = Client.forTestnet().setOperator(
    HEDERA_OPERATOR_ID,
    PrivateKey.fromStringECDSA(HEDERA_OPERATOR_KEY)
  );
} else {
  hederaClient = Client.forTestnet();
}

// -----------------------------------------------------------------------------
// WORLD ID NULLIFIER STORE & HELPERS
// -----------------------------------------------------------------------------
const usedNullifiers = new Map(); // action -> Set<nullifier decimal string>
const recentEvents = [];

function alreadyUsed(action, nullifier) {
  return usedNullifiers.get(action)?.has(nullifier) ?? false;
}

function remember(action, nullifier) {
  if (!usedNullifiers.has(action)) usedNullifiers.set(action, new Set());
  usedNullifiers.get(action).add(nullifier);
}

function logEvent(event) {
  recentEvents.unshift({ time: new Date().toISOString(), ...event });
  recentEvents.length = Math.min(recentEvents.length, 50);
}

function extractNullifier(idkitResponse) {
  const raw =
    idkitResponse?.responses?.[0]?.nullifier ?? 
    idkitResponse?.nullifier_hash ?? 
    idkitResponse?.response?.nullifier ?? 
    null;
  if (!raw) return null;
  try {
    return BigInt(raw).toString(10);
  } catch {
    return String(raw);
  }
}

// -----------------------------------------------------------------------------
// WORLD ID ENDPOINTS
// -----------------------------------------------------------------------------
app.post("/api/rp-signature", (req, res) => {
  const { action } = req.body ?? {};
  if (!action) return res.status(400).json({ error: "action is required" });

  try {
    const { sig, nonce, createdAt, expiresAt } = signRequest({
      signingKeyHex: WORLD_RP_SIGNING_KEY,
      action,
    });
    res.json({ sig, nonce, created_at: createdAt, expires_at: expiresAt });
  } catch (err) {
    res.status(500).json({ error: `Failed to sign request: ${err.message}` });
  }
});

app.post("/api/verify-proof", async (req, res) => {
  const { action, idkitResponse } = req.body ?? {};
  if (!idkitResponse) return res.status(400).json({ error: "idkitResponse is required" });

  let upstream;
  try {
    upstream = await fetch(`https://developer.world.org/api/v4/verify/${WORLD_RP_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(idkitResponse),
    });
  } catch (err) {
    return res.status(502).json({ error: `Could not reach World ID Developer Portal: ${err.message}` });
  }

  const body = await upstream.json().catch(() => ({}));

  if (!upstream.ok) {
    logEvent({ action, ok: false, stage: "verify", detail: body });
    return res.status(400).json({ error: "Verification failed", detail: body });
  }

  const nullifier = extractNullifier(idkitResponse);
  if (!nullifier) {
    logEvent({ action, ok: false, stage: "nullifier", detail: "No nullifier in proof response" });
    return res.status(400).json({ error: "No nullifier found in proof response" });
  }

  if (alreadyUsed(action, nullifier)) {
    logEvent({ action, ok: false, stage: "duplicate", nullifier });
    return res.status(409).json({ error: "This person has already verified for this action", nullifier });
  }

  remember(action, nullifier);
  logEvent({ action, ok: true, nullifier });

  res.json({ success: true, nullifier });
});

// -----------------------------------------------------------------------------
// HELPER FUNCTIONS FOR CONFIG.JSON (AGENTS REGISTRY)
// -----------------------------------------------------------------------------
const ensureConfigFile = () => {
  if (!fs.existsSync(CONFIG_FILE)) {
    const initialData = { agents: [] };
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
};

const readAgents = () => {
  ensureConfigFile();
  const fileData = fs.readFileSync(CONFIG_FILE, 'utf-8');
  try {
    return JSON.parse(fileData);
  } catch (err) {
    return { agents: [] };
  }
};

const writeAgents = (data) => {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

app.get('/api/hcs/providers', async (req, res) => {
  try {
    const providers = await hcsDiscoveryService.fetchHcsAgentCards();
    res.json({ success: true, count: providers.length, providers });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// -----------------------------------------------------------------------------
// HEDERA ACCOUNT ID DERIVATION ROUTE
// -----------------------------------------------------------------------------
app.post('/api/agents/derive-account', async (req, res) => {
  try {
    const { privateKey } = req.body;
    if (!privateKey) {
      return res.status(400).json({ message: 'Private key is required' });
    }

    const cleanHex = privateKey.startsWith('0x') ? privateKey.slice(2) : privateKey;
    const agentKey = PrivateKey.fromStringECDSA(cleanHex);
    const evmAddress = agentKey.publicKey.toEvmAddress();

    const mirrorUrl = `https://testnet.mirrornode.hedera.com/api/v1/accounts/0x${evmAddress}`;
    const response = await fetch(mirrorUrl);

    if (response.ok) {
      const data = await response.json();
      if (data && data.account) {
        return res.json({ 
          accountId: data.account, 
          evmAddress: `0x${evmAddress}`,
          status: 'found'
        });
      }
    }

    return res.json({ 
      accountId: `0.0.${evmAddress}`, 
      evmAddress: `0x${evmAddress}`,
      status: 'alias'
    });

  } catch (error) {
    console.error('Account Derivation Error:', error);
    res.status(500).json({ message: 'Failed to derive Hedera Account ID', error: error.message });
  }
});

// -----------------------------------------------------------------------------
// HCS TOPIC SUBMISSION ROUTE
// -----------------------------------------------------------------------------
app.post('/api/hcs/submit', async (req, res) => {
  try {
    const { topicId, message, accountId, privateKey } = req.body;

    if (!topicId || !message) {
      return res.status(400).json({ message: 'topicId and message payload are required.' });
    }

    const rawKey = privateKey || config.operatorKey;
    const operatorIdStr = accountId || config.operatorId || "0.0.10402297";

    if (!rawKey) {
      return res.status(400).json({ 
        message: 'No private key available to sign the Hedera transaction.' 
      });
    }

    const cleanHex = rawKey.startsWith('0x') ? rawKey.slice(2) : rawKey;
    
    let signingKey;
    try {
      signingKey = PrivateKey.fromStringECDSA(cleanHex);
    } catch (e) {
      signingKey = PrivateKey.fromStringED25519(cleanHex);
    }

    const submitClient = Client.forTestnet().setOperator(
      operatorIdStr,
      signingKey
    );

    const payloadString = typeof message === 'string' ? message : JSON.stringify(message);

    const txResponse = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(payloadString)
      .execute(submitClient);

    const receipt = await txResponse.getReceipt(submitClient);

    res.json({
      success: true,
      sequenceNumber: receipt.topicSequenceNumber.toString(),
      transactionId: txResponse.transactionId.toString(),
      status: receipt.status.toString()
    });
  } catch (error) {
    console.error('HCS Submission Error:', error);
    res.status(500).json({ message: 'Failed to submit message to HCS Topic', error: error.message });
  }
});

// -----------------------------------------------------------------------------
// AGENT MANAGEMENT ROUTES (config.json CRUD)
// -----------------------------------------------------------------------------
app.get('/api/agents', (req, res) => {
  try {
    const data = readAgents();
    res.json(data.agents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to read config.json', error: error.message });
  }
});

app.post('/api/agents', (req, res) => {
  try {
    const newAgent = req.body;
    if (!newAgent || !newAgent.name) {
      return res.status(400).json({ message: 'Invalid agent payload' });
    }

    const data = readAgents();
    data.agents.push(newAgent);
    writeAgents(data);

    res.status(201).json({ message: 'Agent saved successfully', agent: newAgent });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save agent to file', error: error.message });
  }
});

app.put('/api/agents/:id', (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const data = readAgents();

    const agentIndex = data.agents.findIndex((a) => a.id === id);
    if (agentIndex === -1) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    data.agents[agentIndex] = { ...data.agents[agentIndex], ...updates };
    writeAgents(data);

    res.json({ message: 'Agent updated successfully', agent: data.agents[agentIndex] });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update agent in file', error: error.message });
  }
});

// -----------------------------------------------------------------------------
// REAL-TIME EXECUTION STREAM ROUTE (Server-Sent Events)
// -----------------------------------------------------------------------------
app.get('/api/execute-agent-stream', async (req, res) => {
  const { prompt } = req.query;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).send('Query parameter "prompt" is required.');
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const sendEvent = (eventType, payload) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    await clientAgentService.processUserPrompt(
      prompt.trim(),
      0,
      (eventType, payload) => {
        sendEvent(eventType, payload);
      }
    );
  } catch (error) {
    sendEvent('error', error.message || 'Execution error encountered.');
  } finally {
    res.end();
  }
});

// -----------------------------------------------------------------------------
// SERVER INITIALIZATION
// -----------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Backend Server Running on http://localhost:${PORT}`);
  console.log(`====================================================`);
});