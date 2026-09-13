require('dotenv').config();
const { Client, PrivateKey, AccountId, TransferTransaction, TransactionId, Hbar } = require('@hashgraph/sdk');
const env = require('../config/env.js');

class HederaPaymentService {
  constructor() {
    this.client = null;
    this.operatorId = null;
    this.operatorKey = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;

    const operatorIdStr =
      process.env.OPERATOR_ID ||
      process.env.PAYEE_ACCOUNT_ID ||
      env?.operatorId ||
      '0.0.10436180';

    const operatorKeyStr =
      process.env.OPERATOR_KEY ||
      process.env.SERVER_OPERATOR_KEY ||
      process.env.ACCOUNT_PRIVATE_KEY ||
      env?.operatorKey;

    if (!operatorIdStr || !operatorKeyStr) {
      throw new Error(
        'HederaPaymentService Error: OPERATOR_ID or OPERATOR_KEY missing in environment variables (.env).'
      );
    }

    try {
      this.operatorId = AccountId.fromString(operatorIdStr);
      const cleanKey = String(operatorKeyStr).trim().replace(/^["']|["']$/g, '');

      try {
        this.operatorKey = PrivateKey.fromStringECDSA(cleanKey);
      } catch (_) {
        this.operatorKey = PrivateKey.fromString(cleanKey);
      }

      this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
      this.isInitialized = true;
    } catch (err) {
      throw new Error(`HederaPaymentService Initialization Failed: ${err.message}`);
    }
  }

  async createSignedPaymentHeader(requirement, extraAmountTinybars = 0) {
    // Lazy initialize on first call
    this.init();

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