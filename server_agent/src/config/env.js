require('dotenv').config();

module.exports = {
    // Maps your test key variables
    OPERATOR_ACCOUNT_ID: process.env.PAYEE_ACCOUNT_ID || '0.0.10436180',
    OPERATOR_PRIVATE_KEY: process.env.SERVER_OPERATOR_KEY || process.env.ACCOUNT_PRIVATE_KEY,

    payeeAccount: process.env.PAYEE_ACCOUNT_ID || '0.0.10436180',
    requiredAmountTinybars: process.env.REQUIRED_AMOUNT_TINYBARS || '30000000',
    facilitatorUrl: process.env.FACILITATOR_URL,
    geminiApiKey: process.env.GEMINI_API_KEY,
    reclaimAppId: process.env.RECLAIM_APP_ID,
    reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
};