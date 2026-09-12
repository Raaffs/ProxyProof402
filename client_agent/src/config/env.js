require('dotenv').config();

const rawUrl = process.env.SERVER_AGENT_URL || process.env.SERVER_URL || 'http://localhost:8000';
// Strip trailing slash if present to avoid double-slash issues in endpoint paths
const serverAgentUrl = rawUrl.replace(/\/+$/, '');

module.exports = {
  serverAgentUrl,
  reclaimAppId: process.env.RECLAIM_APP_ID,
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
  operatorId: process.env.OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID,
  operatorKey: process.env.OPERATOR_KEY || process.env.ETH_PRIVATE_KEY,
};