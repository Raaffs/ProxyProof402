const facilitatorService = require('../services/facilitator.service.js');
const hederaService = require('../services/hedera.service.js');
const geminiService = require('../services/gemini.service.js');
const signTokenId =  require('../utils/sign')
const env = require('../config/env.js');

class AgentController {
    getAgentCredentials(provider, req) {
        const providerConfigs = {
            gemini: {
                accountId: env.GEMINI_AGENT_ACCOUNT_ID || env.OPERATOR_ACCOUNT_ID || env.payeeAccount,
                privateKey: env.GEMINI_AGENT_PRIVATE_KEY || env.OPERATOR_PRIVATE_KEY,
                tokenRateTinybars: 1000, // 0.001 HBAR per token
            },
            claude: {
                accountId: env.CLAUDE_AGENT_ACCOUNT_ID || env.OPERATOR_ACCOUNT_ID || env.payeeAccount,
                privateKey: env.CLAUDE_AGENT_PRIVATE_KEY || env.OPERATOR_PRIVATE_KEY,
                tokenRateTinybars: 1500,
            },
            openai: {
                accountId: env.OPENAI_AGENT_ACCOUNT_ID || env.OPERATOR_ACCOUNT_ID || env.payeeAccount,
                privateKey: env.OPENAI_AGENT_PRIVATE_KEY || env.OPERATOR_PRIVATE_KEY,
                tokenRateTinybars: 1200,
            },
        };

        const config = providerConfigs[provider.toLowerCase()] || providerConfigs.gemini;

        // Allow explicit override via headers if passed directly by client/caller
        return {
            accountId: req.headers['x-agent-id'] || config.accountId,
            privateKey: req.headers['x-agent-key'] || config.privateKey,
            tokenRateTinybars: config.tokenRateTinybars,
        };
    }

    async handlePaymentCheck(req, res, agentAccountId) {
        // Pass the agent's account ID so the 402 challenge specifies paying THIS agent
        const paymentRequirements = await facilitatorService.buildRequirements(agentAccountId);
        const xPayment = req.headers['x-payment'];

        if (!xPayment) {
            console.log(`[Server] Missing X-PAYMENT header. Sending 402 challenge for agent account: ${agentAccountId}`);
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
        const settlement = await facilitatorService.settlePayment(paymentPayload);
        if (!settlement.success) {
            console.error('[Server Error] Facilitator settlement rejected:', settlement.error);
            res.status(402).json({ error: 'Payment settlement failed', details: settlement.error });
            return null;
        }

        console.log('[Server] Payment settled successfully! Transaction:', settlement.transaction);
        return {
            settlement,
            paidAmountTinybars: settlement.paidAmountTinybars || paymentRequirements.amount,
            payerAccount: settlement.payerAccount,
        };
    }

    getGeminiVerified = async (req, res) => {
        try {
            console.log('[Server] : hellooo')
            const agentCreds = this.getAgentCredentials('gemini', req);
            console.log('[Server] : hiii')

            const paymentState = await this.handlePaymentCheck(req, res, agentCreds.accountId);
            if (!paymentState) return;

            const prompt = req.query.prompt || 'hello';
            console.log(`[Server] Executing zkTLS Gemini call for: "${prompt}"`);

            const zkProof = await geminiService.fetchWithZkProof(prompt);
            
            const { text, totalTokenCount } = geminiService.extractGeminiMetrics(zkProof);
            console.log(`[Server] : init refund `);
            const refundDetails = await hederaService.processRefundIfOverpaid({
                signerAccountId: agentCreds.accountId,
                signerPrivateKey: agentCreds.privateKey,
                payerAccountId: paymentState.payerAccount,
                paidTinybars: paymentState.paidAmountTinybars,
                totalTokens: totalTokenCount,
                tokenRateTinybars: agentCreds.tokenRateTinybars,
            });

            const { signature, signerAddress } = await signTokenId(5, env.OPERATOR_PRIVATE_KEY);
            console.log('[Server]: refund done ')
            res.json({
                status: 'success',
                provider: 'gemini',
                agentAccountId: agentCreds.accountId,
                message: 'Access Granted! Verified Gemini call with zkTLS Proof.',
                transactionId: paymentState.settlement.transaction,
                verified: true,
                output: text,
                tokensUsed: totalTokenCount,
                zkProof: zkProof,
                tokenId: 5,
                signature: signature,
                refundDetails: refundDetails,
            });
        } catch (err) {
            console.error('[Server Error in getGeminiVerified]:', err.message);
            res.status(500).json({ error: 'Internal Server Error', details: err.message });
        }
    };

    getGeminiUnverified = async (req, res) => {
        try {
            const agentCreds = this.getAgentCredentials('gemini', req);

            const paymentState = await this.handlePaymentCheck(req, res, agentCreds.accountId);
            if (!paymentState) return;

            const prompt = req.query.prompt || 'hello';
            const unverifiedData = await geminiService.fetchUnverified(prompt);

            res.json({
                status: 'success',
                provider: 'gemini',
                agentAccountId: agentCreds.accountId,
                message: 'Access Granted! (Unverified Gemini Demo)',
                transactionId: paymentState.settlement.transaction,
                verified: false,
                geminiResponse: unverifiedData,
            });
        } catch (err) {
            console.error('[Server Error in getGeminiUnverified]:', err.message);
            res.status(500).json({ error: 'Internal Server Error', details: err.message });
        }
    };

    getProviderVerified = async (req, res) => {
        const { provider } = req.params;
        switch (provider.toLowerCase()) {
            case 'gemini':
                return this.getGeminiVerified(req, res);
            case 'claude':
                return this.getClaudeVerified(req, res);
            case 'openai':
            case 'chatgpt':
                return this.getOpenAIVerified(req, res);
            default:
                return res.status(404).json({ error: `Provider '${provider}' not supported.` });
        }
    };

    getProviderUnverified = async (req, res) => {
        const { provider } = req.params;
        switch (provider.toLowerCase()) {
            case 'gemini':
                return this.getGeminiUnverified(req, res);
            case 'claude':
                return this.getClaudeUnverified(req, res);
            case 'openai':
            case 'chatgpt':
                return this.getOpenAIUnverified(req, res);
            default:
                return res.status(404).json({ error: `Provider '${provider}' not supported.` });
        }
    };
}

module.exports = new AgentController();