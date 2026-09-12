require('dotenv').config();
const clientAgentService = require('./services/clientAgent.service.js');
const env = require('./config/env.js');

async function main() {
  // Fallback chain for base or target URL
  const rawUrl =
    env.serverTargetUrl ||
    env.serverAgentUrl ||
    process.env.SERVER_AGENT_URL ||
    'http://localhost:8000';

  const cleanUrl = String(rawUrl).replace(/\/+$/, '');

  // Resolve specific endpoints safely
  const verifiedUrl = cleanUrl.includes('/api/protected')
    ? cleanUrl
    : `${cleanUrl}/api/protected/verified`;

  const unverifiedUrl = verifiedUrl.replace('/protected/verified', '/protected/unverified');

  await clientAgentService.runInteractiveDemo();
}

main().catch(console.error);