const facilitatorService = require('../services/facilitator.service.js');
const hederaService = require('../services/hedera.service.js');
const geminiService = require('../services/gemini.service.js');

class AgentController {
  async handlePaymentCheck(req, res) {
    const paymentRequirements = await facilitatorService.buildRequirements();
    const xPayment = req.headers['x-payment'];

    if (!xPayment) {
      console.log('[Server] Missing X-PAYMENT header. Sending 402 challenge.');
      res.status(402).json({
        x402Version: 2,
        error: 'Payment Required',
        accepts: [paymentRequirements],
      });
      return null;
    }

    let paymentPayload;
    try {
      paymentPayload = JSON.parse(Buffer.from(xPayment, 'base64').toString('utf8'));
    } catch (err) {
      console.error('[Server Error] Failed to parse X-PAYMENT base64/JSON:', err.message);
      res.status(400).json({ error: 'Malformed X-PAYMENT header' });
      return null;
    }

    console.log('[Server] Settling payment with facilitator...');
    const settlement = await facilitatorService.settlePayment(paymentPayload, paymentRequirements);
    if (!settlement.success) {
      console.error('[Server Error] Facilitator settlement rejected:', settlement.error);
      res.status(402).json({ error: 'Payment settlement failed', details: settlement.error });
      return null;
    }

    console.log('[Server] Payment settled successfully! Transaction:', settlement.transaction);
    const refundDetails = await hederaService.processRefundIfOverpaid(
      settlement.payerAccount,
      settlement.paidAmountTinybars || paymentRequirements.amount
    );

    return { settlement, refundDetails };
  }

  getProtectedVerified = async (req, res) => {
    try {
      const paymentState = await this.handlePaymentCheck(req, res);
      if (!paymentState) return;

      const prompt = req.query.prompt || 'hello';
      console.log(`[Server] Executing zkTLS Gemini call for: "${prompt}"`);

      const zkProof = await geminiService.fetchWithZkProof(prompt);
      console.log('[Server] proof: ',zkProof)
      res.json({
        status: 'success',
        message: 'Access Granted! Verified with zkTLS Proof.',
        transactionId: paymentState.settlement.transaction,
        verified: true,
        geminiProof: zkProof,
        refundDetails: paymentState.refundDetails,
      });
    } catch (err) {
      console.error('[Server Error in getProtectedVerified]:', err.message);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  };

  getProtectedUnverified = async (req, res) => {
    try {
      const paymentState = await this.handlePaymentCheck(req, res);
      if (!paymentState) return;

      const prompt = req.query.prompt || 'hello';
      const unverifiedData = await geminiService.fetchUnverified(prompt);

      res.json({
        status: 'success',
        message: 'Access Granted! (Unverified Demo Mode)',
        transactionId: paymentState.settlement.transaction,
        verified: false,
        geminiResponse: unverifiedData,
        refundDetails: paymentState.refundDetails,
      });
    } catch (err) {
      console.error('[Server Error in getProtectedUnverified]:', err.message);
      res.status(500).json({ error: 'Internal Server Error', details: err.message });
    }
  };
}

module.exports = new AgentController();