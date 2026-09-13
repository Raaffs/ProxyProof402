const axios = require('axios');
const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
const env = require('../config/env.js');
const hederaPaymentService = require('./hederaPayment.service.js');
const hcsDiscoveryService = require('./hcsDiscovery.service.js');
const {
  verifyProofOffline,
  verifyRefundAccounting,
  extractGeminiMetrics,
  unwrapProof,
  triggerOnChainValidation,
} = require('../utils/verifier.utils.js');
const fs = require('fs');

class ClientAgentService {
  constructor() {
    this.reclaimClient = null;
  }

  /**
   * Lazy initializes the Reclaim Client at runtime to ensure env vars are present
   */
  init() {
    if (this.reclaimClient) return;

    const appId = env.reclaimAppId || process.env.RECLAIM_APP_ID;
    const appSecret = env.reclaimAppSecret || process.env.RECLAIM_APP_SECRET;

    if (!appId || !appSecret) {
      throw new Error(
        'ClientAgentService Error: RECLAIM_APP_ID or RECLAIM_APP_SECRET missing in environment variables (.env).'
      );
    }

    this.reclaimClient = new ReclaimClient(appId, appSecret);
  }

  /**
   * Processes the user prompt, triggers x402 payment, fetches zkTLS proof, and verifies.
   * @param {string} userPrompt - Prompt from CLI or HTTP client.
   * @param {number} overpaymentTinybars - Overpayment test amount.
   * @param {Function} [onProgress] - Optional callback for real-time SSE streaming: (event, payload) => void
   */
  async processUserPrompt(userPrompt, overpaymentTinybars = 0, onProgress = null) {
    this.init();

    const notify = (type, payload) => {
      if (typeof onProgress === 'function') {
        onProgress(type, payload);
      }
      if (type === 'log') {
        console.log(payload);
      }
    };

    notify('log', `\n================ NEW CLIENT AGENT TASK ================`);
    notify('log', `User Input: "${userPrompt}"`);

    // 1. Discovery Phase
    notify('log', `🤖 Querying Hedera Consensus Service (HCS) Mirror Node...`);
    const availableAgents = await hcsDiscoveryService.fetchHcsAgentCards();
    const selectedAgent = await hcsDiscoveryService.discoverAndSelectAgent(userPrompt);

    // Emit discovery payload for UI dynamic card rendering
    notify('discovery', { availableAgents, selectedAgent });
    notify('log', `📌 Selected Agent: ${selectedAgent.name} (${selectedAgent.agentId})`);
    notify('log', `📌 Target Endpoint: ${selectedAgent.endpoint}`);

    const targetUrl = `${selectedAgent.endpoint}?prompt=${encodeURIComponent(userPrompt)}`;

    try {
      // Step 1: Trigger initial 402 challenge (Include ngrok header to bypass warning page)
      let challengeResponse;
      try {
        await axios.get(targetUrl, {
          headers: {
            'ngrok-skip-browser-warning': 'true',
            'User-Agent': 'ClientAgentService/1.0',
          },
        });
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
      notify('log', `📌 402 Payment Challenge Caught.`);
      notify('log', `   Payee: ${requirement.payTo} | Required: ${requirement.amount} tinybars`);

      // Step 2: Sign Hedera transaction payload
      notify('log', `🔒 Signing Hedera Payment Header payload...`);
      const paymentResult = await hederaPaymentService.createSignedPaymentHeader(
        requirement,
        overpaymentTinybars
      );

      // Extract raw string if object was returned, or use directly if string
      const xPaymentHeader =
        typeof paymentResult === 'object' && paymentResult.xPaymentHeader
          ? paymentResult.xPaymentHeader
          : paymentResult;

      const totalPaidTinybars =
        typeof paymentResult === 'object' && paymentResult.totalPaidTinybars
          ? paymentResult.totalPaidTinybars
          : parseInt(requirement.amount, 10) + overpaymentTinybars;

      if (overpaymentTinybars > 0) {
        notify('log', `⚠️ Simulating overpayment of +${overpaymentTinybars} tinybars`);
      }

      // Step 3: Send request with X-PAYMENT header
      notify('log', `🔒 Executing zkTLS request to Server Agent...`);
      const zkProof = await this.reclaimClient.zkFetch(targetUrl, {
        method: 'GET',
        headers: {
          'X-PAYMENT': xPaymentHeader,
          'ngrok-skip-browser-warning': 'true',
        },
        retryCount: 1,
      });

      if (!fs.existsSync('./proofs')) {
        fs.mkdirSync('./proofs', { recursive: true });
      }
      fs.writeFileSync('./proofs/saved_proof.json', JSON.stringify(zkProof, null, 2));

      // Safely parse the outer HTTP body payload returned inside the zkTLS proof
      let responseData = {};
      try {
        const rawHttpResponse =
          zkProof.extractedParameterValues?.data || zkProof.responseData || '{}';
        const jsonStartIndex = rawHttpResponse.indexOf('{');
        if (jsonStartIndex !== -1) {
          responseData = JSON.parse(rawHttpResponse.slice(jsonStartIndex));
        }
      } catch (e) {
        console.error('[ClientAgent] Failed to parse responseData payload:', e.message);
      }

      // Unwrap the inner proof (Gemini zkTLS proof) embedded in the server's response
      const innerProof = unwrapProof(responseData.zkProof || zkProof);
      console.log(' proof: ',zkProof)
      // Offline Cryptographic Verification
      const verification = verifyProofOffline(innerProof);
      notify('log', `✅ Proof Validated Offline: ${verification.isValid ? 'YES' : 'NO'}`);
      if (verification.signers && verification.signers.length > 0) {
        notify('log', `   Witness Address: ${verification.signers[0]}`);
      }

      // Extract Text Output & Token Metrics from Inner Proof
      const { text: extractedOutputText } = extractGeminiMetrics(innerProof);
      const outputText = responseData.output || extractedOutputText || 'N/A';

      // Financial Refund Audit
      let auditResult = null;
      if (responseData.refundDetails) {
        auditResult = verifyRefundAccounting({
          zkProof: innerProof,
          refundDetails: responseData.refundDetails,
          paidTinybars: totalPaidTinybars,
          tokenRateTinybars: selectedAgent.rateTinybars || 1000,
        });

        notify('log', `\n✅ [Accounting Audit]`);
        notify('log', `   Tokens Used: ${auditResult.totalTokenCount}`);
        notify('log', `   Expected Cost: ${auditResult.expectedActualCost} tinybars`);
        notify('log', `   Refund Amount: ${auditResult.reportedRefundAmount} tinybars`);
        notify('log', `   Audit Verdict: ${auditResult.isMathCorrect ? 'MATCH ✅' : 'MISMATCH ❌'}`);
      }

        // notify('log', `\n⚠️ Offline verification or accounting check failed! Triggering on-chain validation & slashing...`);

        try {
          const validatorAddress = "0x2f5c713bb70DBCD6fa63B3c5afEB0fDC3239cD46" ;
          const signer = hederaPaymentService.getEthersSigner(); // Wallet Signer

          const receipt = await triggerOnChainValidation({
            contractAddress: validatorAddress,
            signer: signer,
            responseData: responseData,
          });

          notify('log', `⚡ On-chain validateUsage executed! Tx Hash: ${receipt.hash}`);
        } catch (contractErr) {
          notify('log', `❌ On-chain validation failed: ${contractErr.message}`);
          throw contractErr;
        }
    

      notify('log', `\n💬 [Agent Output Response]:\n${outputText}`);

      // Emit complete structured success payload for UI
      notify('success', {
        output: outputText,
        selectedAgent,
        audit: auditResult,
        zkProofSummary: {
          identifier: innerProof.identifier || zkProof.identifier || 'Verified via Reclaim zkTLS',
          witness: verification.signers?.[0] || zkProof.witnesses?.[0]?.address || 'Verified On-Chain',
        },
      });

      return zkProof;
    } catch (error) {
      const errorMsg = error.response?.data?.message || error.message || 'Error processing request';
      notify('error', errorMsg);
      throw error;
    }
  }
}

module.exports = new ClientAgentService();