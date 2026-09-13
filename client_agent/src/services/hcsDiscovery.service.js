const axios = require('axios');
const env = require('../config/env.js');

class HcsDiscoveryService {
  constructor() {
    this.mirrorNodeUrl = (env.hederaMirrorUrl || 'https://testnet.mirrornode.hedera.com').replace(/\/+$/, '');
    // Explicitly fallback to target HCS topic ID if missing from environment variables
    this.discoveryTopicId = env.hcsDiscoveryTopicId || process.env.HCS_TOPIC_ID || '0.0.10402297';
  }

  /**
   * Fallback agent directory used when HCS Mirror Node returns no active topics or fails.
   */
  getFallbackAgentCards() {
    const baseUrl = (env.serverAgentUrl || 'http://localhost:8000').replace(/\/+$/, '');
    return [
      {
        agentId: '0.0.10436180',
        name: 'Gemini-Flash-zkTLS-Agent',
        description: 'Autonomous AI Agent on Hedera',
        capabilities: ['gemini', 'google', 'llm', 'chat', 'reasoning'],
        endpoint: `${baseUrl}/api/protected/verified/gemini`,
        identity: null,
        rateTinybars: 1000,
        score: 98,
        status: 'ACTIVE',
        sequenceNumber: 1
      },
      {
        agentId: '0.0.10436181',
        name: 'Claude-3.5-zkTLS-Agent',
        description: 'Autonomous AI Agent on Hedera',
        capabilities: ['claude', 'anthropic', 'coding', 'llm'],
        endpoint: `${baseUrl}/api/agent/claude`,
        identity: null,
        rateTinybars: 1500,
        score: 95,
        status: 'ACTIVE',
        sequenceNumber: 2
      },
      {
        agentId: '0.0.10436182',
        name: 'OpenAI-GPT4-zkTLS-Agent',
        description: 'Autonomous AI Agent on Hedera',
        capabilities: ['openai', 'gpt', 'gpt4', 'chatgpt'],
        endpoint: `${baseUrl}/api/agent/openai`,
        identity: null,
        rateTinybars: 1200,
        score: 92,
        status: 'ACTIVE',
        sequenceNumber: 3
      }
    ];
  }

  /**
   * Reads all registered agent capability cards from Hedera Consensus Service (HCS) Mirror Node
   */
  async fetchHcsAgentCards() {
    if (!this.discoveryTopicId) {
      console.warn('[HCS Discovery] No topic ID configured. Returning fallbacks.');
      return this.getFallbackAgentCards();
    }

    try {
      let rawMessages = [];
      let nextUrl = `${this.mirrorNodeUrl}/api/v1/topics/${this.discoveryTopicId}/messages?order=asc&limit=100`;

      // 1. Paginate through messages on the Hedera Mirror Node
      while (nextUrl) {
        const fullUrl = nextUrl.startsWith('http') ? nextUrl : `${this.mirrorNodeUrl}${nextUrl}`;
        const response = await axios.get(fullUrl);
        const data = response.data;

        if (data && Array.isArray(data.messages)) {
          rawMessages.push(...data.messages);
        }

        nextUrl = data?.links?.next ? data.links.next : null;
      }

      if (rawMessages.length === 0) {
        console.log(`[HCS Discovery] Topic ${this.discoveryTopicId} has no messages. Using fallbacks.`);
        return this.getFallbackAgentCards();
      }

      // 2. Map and parse HCS-26 registration messages
      const parsedMap = new Map();

      for (const msg of rawMessages) {
        try {
          const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
          let parsed = JSON.parse(decoded);

          // Handle double-stringified JSON payloads if present
          if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed);
          }

          if (!parsed || typeof parsed !== 'object') {
            continue; // Drop non-object structures
          }

          const meta = parsed.metadata || {};

          // Root & Metadata mappings per HCS-26 protocol schema
          const accountId = parsed.account_id || parsed.agentId || meta.account_id || meta.agentId;
          const agentName = meta.name || parsed.name || parsed.agentName;
          const endpointUrl = meta.thirdPartyUri || parsed.endpoint || parsed.url || '';
          const description = meta.description || parsed.description || 'Autonomous AI Agent on Hedera';
          const identity = meta.identity || parsed.identity || null;

          // Drop message if core minimum requirements are completely missing/invalid
          if (!accountId || !agentName) {
            continue;
          }

          // Parse skills/tags safely (handles numeric tags e.g. [60101, 60201] or strings)
          let caps = meta.tags || parsed.capabilities || ['llm'];
          if (!Array.isArray(caps)) {
            caps = [String(caps)];
          } else {
            caps = caps.map(String);
          }

          const agentKey = accountId;

          const formattedAgent = {
            agentId: accountId,
            name: agentName,
            description: description,
            capabilities: caps,
            endpoint: endpointUrl,
            identity: identity,
            rateTinybars: parsed.rateTinybars || meta.rateTinybars || 1000,
            score: parsed.score || meta.score || 90,
            status: 'ACTIVE',
            sequenceNumber: msg.sequence_number,
            consensusTimestamp: msg.consensus_timestamp,
            topicId: this.discoveryTopicId
          };

          // Keep latest consensus message per account ID identity
          parsedMap.set(agentKey, formattedAgent);
        } catch (_) {
          // Drop corrupt/unparseable messages silently
        }
      }

      const cards = Array.from(parsedMap.values());
      return cards.length > 0 ? cards : this.getFallbackAgentCards();

    } catch (err) {
      console.warn(`[HCS Discovery Warning] Mirror node fetch failed (${err.message}). Using fallback directory.`);
      return this.getFallbackAgentCards();
    }
  }

  async discoverAndSelectAgent(userPrompt) {
    const baseUrl = (env.serverAgentUrl || 'http://localhost:8000').replace(/\/+$/, '');
    
    // MOCK: Hardcoded to always return the Gemini Flash agent
    const matchedAgent = {
      agentId: '0.0.10436180',
      name: 'Gemini-Flash-zkTLS-Agent',
      description: 'Autonomous AI Agent on Hedera',
      capabilities: ['gemini', 'google', 'llm', 'chat', 'reasoning'],
      endpoint: `${baseUrl}/api/protected/verified/gemini`,
      identity: null,
      rateTinybars: 1000,
      score: 98,
      status: 'ACTIVE',
      sequenceNumber: 1
    };

    console.log(`\n🤖 [Mock Agent Selected]`);
    console.log(`   Name: ${matchedAgent.name}`);
    console.log(`   Account ID: ${matchedAgent.agentId}`);
    console.log(`   Endpoint: ${matchedAgent.endpoint}`);

    return matchedAgent;
  }
}

module.exports = new HcsDiscoveryService();