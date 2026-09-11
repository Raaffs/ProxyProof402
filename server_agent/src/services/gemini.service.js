const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
const axios = require('axios');
const env = require('../config/env.js');

class GeminiService {
  constructor() {
    this.reclaimClient = new ReclaimClient(env.reclaimAppId, env.reclaimAppSecret);
    this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
  }

  async fetchWithZkProof(prompt) {
    const publicOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
    };

    const privateOptions = {
      headers: { 'x-goog-api-key': env.geminiApiKey },
    };

    return await this.reclaimClient.zkFetch(this.endpoint, publicOptions, privateOptions);
  }

  async fetchUnverified(prompt) {
    const response = await axios.post(
      `${this.endpoint}?key=${env.geminiApiKey}`,
      { contents: [{ parts: [{ text: prompt }] }] },
      { headers: { 'Content-Type': 'application/json' } }
    );
    return response.data;
  }
}

module.exports = new GeminiService();