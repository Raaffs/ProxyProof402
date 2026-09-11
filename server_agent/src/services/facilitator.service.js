const axios = require('axios');
const env = require('../config/env.js');

class FacilitatorService {
  constructor() {
    this.feePayerCache = null;
    this.network = 'hedera:testnet';
  }

  async getFeePayer() {
    if (this.feePayerCache) return this.feePayerCache;
    const { data } = await axios.get(`${env.facilitatorUrl}/supported`);
    const kind = (data.kinds || []).find((k) => k.network === this.network && k.scheme === 'exact');
    if (!kind?.extra?.feePayer) {
      throw new Error(`Facilitator missing feePayer for ${this.network}`);
    }
    this.feePayerCache = kind.extra.feePayer;
    return this.feePayerCache;
  }

  async buildRequirements() {
    const feePayer = await this.getFeePayer();
    return {
      scheme: 'exact',
      network: this.network,
      amount: env.requiredAmountTinybars,
      payTo: env.payeeAccount,
      maxTimeoutSeconds: 300,
      asset: '0.0.0',
      extra: { feePayer },
    };
  }

  async settlePayment(paymentPayload) {
    // Pass paymentPayload.accepted directly so requirements match 1:1
    const paymentRequirements = paymentPayload.accepted;

    try {
      const response = await axios.post(`${env.facilitatorUrl}/settle`, {
        x402Version: 2,
        paymentPayload,
        paymentRequirements,
      });

      if (response.data && response.data.success) {
        return {
          success: true,
          transaction: response.data.transaction,
          payerAccount: response.data.payer || response.data.payerAccount || env.payeeAccount,
          paidAmountTinybars: paymentRequirements?.amount || env.requiredAmountTinybars,
        };
      } else {
        console.error('[Facilitator Rejection]:', response.data);
        return { success: false, error: JSON.stringify(response.data) };
      }
    } catch (err) {
      const details = err.response?.data || err.message;
      console.error('[Facilitator Error]:', details);
      return { success: false, error: typeof details === 'object' ? JSON.stringify(details) : details };
    }
  }
}

module.exports = new FacilitatorService();