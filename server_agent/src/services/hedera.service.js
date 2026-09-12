const { Client, PrivateKey, AccountId, TransferTransaction, Hbar } = require('@hashgraph/sdk');

class HederaService {
    /**
     * Parses ED25519 or ECDSA private key strings safely
     */
    parsePrivateKey(keyString) {
        if (!keyString) throw new Error('Private key string is undefined or empty');

        const cleanKey = String(keyString).trim().replace(/^["']|["']$/g, '');

        // 1. Try raw ECDSA hex parsing
        try {
            return PrivateKey.fromStringECDSA(cleanKey);
        } catch (_) {}

        // 2. Try DER-encoded / ED25519 parsing
        try {
            return PrivateKey.fromString(cleanKey);
        } catch (_) {}

        // 3. Try appending 0x prefix if missing for ECDSA
        if (!cleanKey.startsWith('0x')) {
            try {
                return PrivateKey.fromStringECDSA(`0x${cleanKey}`);
            } catch (_) {}
        }

        throw new Error(`Failed to parse Hedera PrivateKey from string: ${cleanKey.slice(0, 10)}...`);
    }

    createClient(accountId, privateKey) {
        if (!accountId || !privateKey) {
            throw new Error(
                `Hedera client error: Missing credentials. (AccountId: ${accountId}, Key provided: ${Boolean(privateKey)})`
            );
        }

        const id = typeof accountId === 'string' ? AccountId.fromString(accountId) : accountId;
        const key = this.parsePrivateKey(privateKey);

        return Client.forTestnet().setOperator(id, key);
    }

    async processRefundIfOverpaid({
        signerAccountId,
        signerPrivateKey,
        payerAccountId,
        paidTinybars,
        totalTokens,
        tokenRateTinybars = 1000
    }) {
        const actualCostTinybars = BigInt(totalTokens) * BigInt(tokenRateTinybars);
        const paid = BigInt(paidTinybars);

        if (paid <= actualCostTinybars) {
            console.log(`[Server] no refund required...`);

            return {
                refunded: false,
                reason: 'No overpayment detected',
                actualCostTinybars: actualCostTinybars.toString()
            };
        }

        const refundAmountTinybars = paid - actualCostTinybars;

        try {
            console.log(`[Server] doing refund...`);
            const client = this.createClient(signerAccountId, signerPrivateKey);

            const tx = await new TransferTransaction()
                .addHbarTransfer(AccountId.fromString(signerAccountId), Hbar.fromTinybars(-Number(refundAmountTinybars)))
                .addHbarTransfer(AccountId.fromString(payerAccountId), Hbar.fromTinybars(Number(refundAmountTinybars)))
                .execute(client);

            const receipt = await tx.getReceipt(client);
            client.close();

            return {
                refunded: receipt.status.toString() === 'SUCCESS',
                refundTxId: tx.transactionId.toString(),
                refundAmountTinybars: refundAmountTinybars.toString(),
                actualCostTinybars: actualCostTinybars.toString(),
                recipientAccount: payerAccountId,
            };
        } catch (err) {
            console.error('[HederaService] Refund error:', err.message);
            return {
                refunded: false,
                reason: `Refund transaction failed: ${err.message}`,
                refundAmountTinybars: refundAmountTinybars.toString(),
            };
        }
    }
}

module.exports = new HederaService();