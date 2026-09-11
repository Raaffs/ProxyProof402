require('dotenv').config();

module.exports = {
  port: process.env.PORT || 8000,
  payeeAccount: process.env.PAYEE_ACCOUNT_ID || process.env.ACCOUNT_ID || '0.0.10436180',
  serverOperatorKey: process.env.ACCOUNT_PRIVATE_KEY || process.env.SERVER_OPERATOR_KEY || process.env.OPERATOR_KEY,
  requiredAmountTinybars: process.env.REQUIRED_AMOUNT_TINYBARS || '10000000',
  facilitatorUrl: process.env.FACILITATOR_URL || 'https://api.testnet.blocky402.com',
  geminiApiKey: process.env.GEMINI_API_KEY,
  reclaimAppId: process.env.RECLAIM_APP_ID,
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
};