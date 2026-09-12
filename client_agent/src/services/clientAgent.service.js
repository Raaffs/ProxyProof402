const axios = require('axios');
const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
const env = require('../config/env.js');
const hederaPaymentService = require('./hederaPayment.service.js');
const hcsDiscoveryService = require('./hcsDiscovery.service.js');
const {
  verifyProofOffline,
  verifyRefundAccounting,
  unwrapProof,
} = require('../utils/verifier.utils.js');
const fs = require('fs');
class ClientAgentService {
  constructor() {
    this.reclaimClient = new ReclaimClient(env.reclaimAppId, env.reclaimAppSecret);
  }

  async processUserPrompt(userPrompt, overpaymentTinybars = 0) {
    console.log(`\n================ NEW CLIENT AGENT TASK ================`);
    console.log(`User Input: "${userPrompt}"`);

    // 1. Discovery Phase
    const selectedAgent = await hcsDiscoveryService.discoverAndSelectAgent(userPrompt);
    const targetUrl = `${selectedAgent.endpoint}?prompt=${encodeURIComponent(userPrompt)}`;

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
      // Step 2: Sign Hedera transaction payload
      const paymentResult = await hederaPaymentService.createSignedPaymentHeader(requirement, 0);

      // Extract raw string if object was returned, or use directly if string
      const xPaymentHeader = typeof paymentResult === 'object' && paymentResult.xPaymentHeader 
        ? paymentResult.xPaymentHeader 
        : paymentResult;
      
      const totalPaidTinybars = typeof paymentResult === 'object' && paymentResult.totalPaidTinybars 
        ? paymentResult.totalPaidTinybars 
        : parseInt(requirement.amount, 10) + overpaymentTinybars;

      console.log(`⚠️ Simulating overpayment of +${overpaymentTinybars} tinybars`);

      // Step 3: Send request with X-PAYMENT header (EXACT ORIGINAL CALL)
      console.log(`🔒 Executing zkTLS request to Server Agent...`);
      const zkProof = await this.reclaimClient.zkFetch(targetUrl, {
        method: 'GET',
        headers: { 'X-PAYMENT': xPaymentHeader },
        retryCount: 1,
      });

      console.log('client proof : ', zkProof);
if (!fs.existsSync('./proofs')) {
  fs.mkdirSync('./proofs', { recursive: true });
}
fs.writeFileSync('./proofs/saved_proof.json', JSON.stringify(zkProof, null, 2));
      // Extract inner proof for auditing
      const responseData = JSON.parse(
        zkProof.extractedParameterValues?.response ||
        zkProof.responseData ||
        '{}'
      );

      const innerProof = unwrapProof(responseData.zkProof || zkProof);

      // Offline Verification
      const verification = verifyProofOffline(innerProof);
      console.log('Proof Validated:', verification.isValid ? 'YES' : 'NO');
      if (verification.signers && verification.signers.length > 0) {
        console.log('Witness Address:', verification.signers[0]);
      }

      // Financial Refund Audit
      if (responseData.refundDetails) {
        const audit = verifyRefundAccounting({
          zkProof: innerProof,
          refundDetails: responseData.refundDetails,
          paidTinybars: totalPaidTinybars,
          tokenRateTinybars: selectedAgent.rateTinybars || 1000,
        });

        console.log(`\n✅ [Accounting Audit]`);
        console.log(`   Tokens Used: ${audit.totalTokenCount}`);
        console.log(`   Expected Cost: ${audit.expectedActualCost} tinybars`);
        console.log(`   Refund Amount: ${audit.reportedRefundAmount} tinybars`);
        console.log(`   Audit Verdict: ${audit.isMathCorrect ? 'MATCH ✅' : 'MISMATCH ❌'}`);
      }

      console.log(`\n💬 [Agent Output Response]:`);
      console.log(responseData.output || responseData.geminiResponse || 'N/A');

      return zkProof;
    } catch (error) {
      console.error(`Error processing request:`, error.response?.data || error.message);
      throw error;
    }
  }
}

module.exports = new ClientAgentService();