const { Client, PrivateKey, AccountId, TransactionId, TransferTransaction, Hbar } = require('@hashgraph/sdk');
const env = require('../config/env.js');

class HederaPaymentService {
  constructor() {
    const operatorIdStr = env.operatorId || process.env.OPERATOR_ID || process.env.PAYEE_ACCOUNT_ID || '0.0.10436180';
    const operatorKeyStr = env.operatorKey || process.env.SERVER_OPERATOR_KEY || process.env.ACCOUNT_PRIVATE_KEY;

    if (!operatorIdStr || !operatorKeyStr) {
      throw new Error('HederaPaymentService: Missing OPERATOR_ID or OPERATOR_KEY credentials.');
    }

    this.operatorId = AccountId.fromString(operatorIdStr);

    const cleanKey = String(operatorKeyStr).trim().replace(/^["']|["']$/g, '');
    try {
      this.operatorKey = PrivateKey.fromStringECDSA(cleanKey);
    } catch (_) {
      this.operatorKey = PrivateKey.fromString(cleanKey);
    }

    this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
  }

  /**
   * Constructs and signs an x402-compliant Hedera TransferTransaction payload.
   * Supports optional overpayment to test dynamic server-side refunds.
   */
  async createSignedPaymentHeader(requirement, extraAmountTinybars = 0) {
    const totalAmount = parseInt(requirement.amount, 10) + extraAmountTinybars;
    const feePayerId = AccountId.fromString(requirement.extra?.feePayer || requirement.payTo);

    const transaction = new TransferTransaction()
      .setTransactionId(TransactionId.generate(feePayerId))
      .addHbarTransfer(this.operatorId, Hbar.fromTinybars(-totalAmount))
      .addHbarTransfer(AccountId.fromString(requirement.payTo), Hbar.fromTinybars(totalAmount))
      .freezeWith(this.client);

    const signedTx = await transaction.sign(this.operatorKey);
    const base64Tx = Buffer.from(signedTx.toBytes()).toString('base64');

    const paymentPayload = {
      x402Version: 2,
      scheme: 'exact',
      network: 'hedera:testnet',
      accepted: requirement,
      payload: { transaction: base64Tx },
    };

    return {
      xPaymentHeader: Buffer.from(JSON.stringify(paymentPayload)).toString('base64'),
      totalPaidTinybars: totalAmount,
    };
  }
}

module.exports = new HederaPaymentService();