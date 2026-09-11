const { Client, PrivateKey, AccountId, TransferTransaction, Hbar } = require('@hashgraph/sdk');
const env = require('../config/env.js');

class HederaService {
  constructor() {
    this.client = null;
    this.operatorKey = null;

    if (env.serverOperatorKey && env.payeeAccount) {
      const accountId = AccountId.fromString(env.payeeAccount);
      this.operatorKey = PrivateKey.fromStringECDSA(env.serverOperatorKey);
      this.client = Client.forTestnet().setOperator(accountId, this.operatorKey);
    }
  }

  async processRefundIfOverpaid(payerAccountId, paidAmountTinybars) {
    const required = BigInt(env.requiredAmountTinybars);
    const paid = BigInt(paidAmountTinybars);

    if (paid <= required) {
      return { refunded: false, reason: 'No overpayment detected' };
    }

    const refundAmount = paid - required;

    if (!this.client || !this.operatorKey || !payerAccountId) {
      return {
        refunded: false,
        reason: 'Server missing operator keys to execute automatic refund',
        refundAmountTinybars: refundAmount.toString(),
      };
    }

    try {
      const tx = await new TransferTransaction()
        .addHbarTransfer(AccountId.fromString(env.payeeAccount), Hbar.fromTinybars(-Number(refundAmount)))
        .addHbarTransfer(AccountId.fromString(payerAccountId), Hbar.fromTinybars(Number(refundAmount)))
        .execute(this.client);

      const receipt = await tx.getReceipt(this.client);

      return {
        refunded: receipt.status.toString() === 'SUCCESS',
        refundTxId: tx.transactionId.toString(),
        refundAmountTinybars: refundAmount.toString(),
        recipientAccount: payerAccountId,
      };
    } catch (err) {
      return {
        refunded: false,
        reason: `Refund transaction failed: ${err.message}`,
        refundAmountTinybars: refundAmount.toString(),
      };
    }
  }
}

module.exports = new HederaService();