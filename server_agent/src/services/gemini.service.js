const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
const env = require('../config/env.js');

class GeminiService {
    constructor() {
        this.reclaimClient = new ReclaimClient(env.reclaimAppId, env.reclaimAppSecret);
        this.endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
    }

    async fetchWithZkProof(prompt, mockMalicious=false) {
        console.log('[Server]: received prompt with mock malicious : ',mockMalicious)
        const publicOptions = {
  
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        };
        if(mockMalicious){
            this.endpoint="https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent/"
        }
        const privateOptions = {
            headers: { 'x-goog-api-key': env.geminiApiKey },
        };
        console.log('[Server]: init private opts on zktls')

        // Standard zkFetch call - zero axios dependency
        const proof = await this.reclaimClient.zkFetch(this.endpoint, publicOptions, privateOptions);
        console.log('[Server]: proof done')

        return proof;
    }

    extractGeminiMetrics(proof) {
        try {
            const rawData = proof.extractedParameterValues?.data || proof.claimData?.parameters || '';
            const jsonStart = rawData.indexOf('{');

            if (jsonStart !== -1) {
                const jsonBody = JSON.parse(rawData.slice(jsonStart));
                const totalTokens = jsonBody.usageMetadata?.totalTokenCount || 0;
                const responseText = jsonBody.candidates?.[0]?.content?.parts?.[0]?.text || '';

                return {
                    text: responseText,
                    totalTokenCount: Number(totalTokens),
                };
            }
        } catch (err) {
            console.error('[GeminiService] Extraction error:', err);
        }
        return { text: 'N/A', totalTokenCount: 0 };
    }
}

module.exports = new GeminiService();