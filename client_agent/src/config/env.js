const path = require('path');

// Explicitly point to the .env file in the root directory
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const rawUrl = process.env.SERVER_AGENT_URL || process.env.SERVER_URL || 'http://localhost:8000';
// Strip trailing slash if present to avoid double-slash issues in endpoint paths
const serverAgentUrl = rawUrl.replace(/\/+$/, '');

module.exports = {
  serverAgentUrl,
  reclaimAppId: process.env.RECLAIM_APP_ID,
  reclaimAppSecret: process.env.RECLAIM_APP_SECRET,
  operatorId: process.env.OPERATOR_ID || process.env.HEDERA_ACCOUNT_ID,
  operatorKey: process.env.OPERATOR_KEY ,
  evmkey: process.env.ETH_PRIVATE_KEY,
  hcsDiscoveryTopicId: process.env.HCS_TOPIC_ID || '0.0.10402297',
  hederaMirrorUrl: process.env.HEDERA_MIRROR_URL || 'https://testnet.mirrornode.hedera.com',
  WORLD_APP_ID : process.env.WORLD_APP_ID,
  WORLD_RP_ID :process.env.WORLD_RP_ID,
  WORLD_RP_SIGNING_KEY : process.env.WORLD_RP_SIGNING_KEY
};