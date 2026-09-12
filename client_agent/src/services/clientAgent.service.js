const axios = require('axios');
const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
const env = require('../config/env.js');
const hederaPaymentService = require('./hederaPayment.service.js');

class ClientAgentService {
    constructor() {
        this.reclaimClient = new ReclaimClient(env.reclaimAppId, env.reclaimAppSecret);
    }

    async executeRequestWithPayment(endpoint, isVerified = true) {
        const targetUrl = `${env.serverAgentUrl}${endpoint}`;
        console.log(`\n================ ATTEMPTING REQUEST ================`);
        console.log(`Target URL: ${targetUrl}`);

        try {
            // Step 1: Trigger initial 402 challenge
            let challengeResponse;
            try {
                await axios.get(targetUrl);
            } catch (err) {
                if (err.response && err.response.status === 402) {
                    challengeResponse = err.response.data;
                } else {
                    throw err;
                }
            }

            if (!challengeResponse || !challengeResponse.accepts?.[0]) {
                throw new Error('Server did not respond with a valid 402 payment requirement.');
            }

            const requirement = challengeResponse.accepts[0];
            console.log(`📌 402 Payment Challenge Caught.`);
            console.log(`   Payee: ${requirement.payTo} | Required: ${requirement.amount} tinybars`);

            // Step 2: Sign Hedera transaction payload (simulating +5,000,000 tinybars overpayment)
            const overpayment = 0;
            console.log(`⚠️ Simulating overpayment of +${overpayment} tinybars`);
            const xPaymentHeader = await hederaPaymentService.createSignedPaymentHeader(requirement, overpayment);

            // Step 3: Send request with X-PAYMENT header
            console.log(`🔒 Executing zkTLS request to Server Agent...`);
            const zkProof = await this.reclaimClient.zkFetch(targetUrl, {
                method: 'GET',
                headers: { 'X-PAYMENT': xPaymentHeader },
                retryCount: 1
            });
            console.log('client proof : ', zkProof)
            const verification = verifyProofOffline(zkProof);
            console.log('Proof Validated:', verification.isValid ? 'YES' : 'NO');
            console.log('Witness Address:', verification.signers[0]);

            return zkProof;

        } catch (error) {
            console.log('[client] proof :', zkProof)
            console.error(`Error processing request:`, error.response?.data || error.message);
            throw error;
        }
    }

    async runInteractiveDemo() {
        console.log('\n=== DEMO 1: VERIFIED zkTLS ENDPOINT (WITH OVERPAYMENT REFUND) ===');
        await this.executeRequestWithPayment('/api/protected/verified', true);
    }
}

module.exports = new ClientAgentService();