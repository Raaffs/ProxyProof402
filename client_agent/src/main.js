require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

// Import your services
const clientAgentService = require('./services/clientAgent.service.js');
const hcsDiscoveryService = require('./services/hcsDiscovery.service.js');

const app = express();
const PORT = process.env.PORT || 5000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(express.json());

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

// -----------------------------------------------------------------------------
// AGENT MANAGEMENT ROUTES (config.json CRUD)
// -----------------------------------------------------------------------------

// GET /api/agents - Read saved agents from file
app.get('/api/agents', (req, res) => {
  try {
    const data = readAgents();
    res.json(data.agents);
  } catch (error) {
    res.status(500).json({ message: 'Failed to read config.json', error: error.message });
  }
});

// POST /api/agents - Save a new agent to file
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

// PUT /api/agents/:id - Update an agent (e.g., mark as deployed)
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

// GET /api/execute-agent-stream?prompt=your_prompt_here
app.get('/api/execute-agent-stream', async (req, res) => {
  const { prompt } = req.query;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).send('Query parameter "prompt" is required.');
  }

  // 1. Initialize SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Helper function to write typed SSE data frames
  const sendEvent = (eventType, payload) => {
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    // Execute the workflow, streaming progress step-by-step
    await clientAgentService.processUserPrompt(
      prompt.trim(),
      0, // overpayment tinybars
      (eventType, payload) => {
        sendEvent(eventType, payload);
      }
    );
  } catch (error) {
    // Errors are reported through SSE before closing connection
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