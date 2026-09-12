const { Client, PrivateKey, AccountId, TransactionId, TransferTransaction, Hbar } = require('@hashgraph/sdk');
const env = require('../config/env.js');

class HederaPaymentService {
  constructor() {
    const operatorIdStr = env.operatorId || process.env.OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID;
    const operatorKeyStr = env.operatorKey || process.env.OPERATOR_KEY || process.env.ETH_PRIVATE_KEY;

    this.operatorId = AccountId.fromString(operatorIdStr);
    this.operatorKey = PrivateKey.fromStringECDSA(operatorKeyStr);
    this.client = Client.forTestnet().setOperator(this.operatorId, this.operatorKey);
  }

  async createSignedPaymentHeader(requirement, extraAmountTinybars = 0) {
    const totalAmount = parseInt(requirement.amount, 10) + extraAmountTinybars;
    const feePayerId = AccountId.fromString(requirement.extra.feePayer);

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

    return Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  }
}

module.exports = new HederaPaymentService();