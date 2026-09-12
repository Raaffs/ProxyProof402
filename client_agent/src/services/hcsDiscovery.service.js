const axios = require('axios');
const env = require('../config/env.js');

class HcsDiscoveryService {
  constructor() {
    this.mirrorNodeUrl = env.hederaMirrorUrl || 'https://testnet.mirrornode.hedera.com';
    this.discoveryTopicId = env.hcsDiscoveryTopicId || null;
  }

  getFallbackAgentCards() {
    const baseUrl = (env.serverAgentUrl || 'http://localhost:8000').replace(/\/+$/, '');
    return [
      {
        agentId: '0.0.10436180',
        name: 'Gemini-Flash-zkTLS-Agent',
        capabilities: ['gemini', 'google', 'llm', 'chat', 'reasoning'],
        endpoint: `${baseUrl}/api/protected/verified/gemini`,
        rateTinybars: 1000,
      },
      {
        agentId: '0.0.10436180',
        name: 'Claude-3.5-zkTLS-Agent',
        capabilities: ['claude', 'anthropic', 'coding', 'llm'],
        endpoint: `${baseUrl}/api/protected/verified/claude`,
        rateTinybars: 1500,
      },
      {
        agentId: '0.0.10436180',
        name: 'OpenAI-GPT4-zkTLS-Agent',
        capabilities: ['openai', 'gpt', 'gpt4', 'chatgpt'],
        endpoint: `${baseUrl}/api/protected/verified/openai`,
        rateTinybars: 1200,
      },
    ];
  }

  async fetchHcsAgentCards() {
    if (!this.discoveryTopicId) {
      return this.getFallbackAgentCards();
    }

    try {
      const response = await axios.get(
        `${this.mirrorNodeUrl}/api/v1/topics/${this.discoveryTopicId}/messages`
      );

      const cards = response.data.messages
        .map((msg) => {
          try {
            const decoded = Buffer.from(msg.message, 'base64').toString('utf8');
            return JSON.parse(decoded);
          } catch (_) {
            return null;
          }
        })
        .filter((card) => card && card.endpoint && card.capabilities);

      return cards.length > 0 ? cards : this.getFallbackAgentCards();
    } catch (err) {
      console.warn(`[HCS Discovery Warning] Using fallback cards due to: ${err.message}`);
      return this.getFallbackAgentCards();
    }
  }

  async discoverAndSelectAgent(userPrompt) {
    const agentCards = await this.fetchHcsAgentCards();
    const lowerPrompt = userPrompt.toLowerCase();

    let matchedAgent = agentCards.find((agent) =>
      agent.capabilities.some((cap) => lowerPrompt.includes(cap.toLowerCase()))
    );

    if (!matchedAgent) {
      matchedAgent = agentCards.find((a) => a.capabilities.includes('gemini')) || agentCards[0];
    }

    console.log(`\n🤖 [Agent Selected via HCS]`);
    console.log(`   Name: ${matchedAgent.name}`);
    console.log(`   Account ID: ${matchedAgent.agentId}`);
    console.log(`   Endpoint: ${matchedAgent.endpoint}`);

    return matchedAgent;
  }
}

module.exports = new HcsDiscoveryService();