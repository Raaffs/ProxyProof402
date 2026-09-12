require('dotenv').config();
const readline = require('readline');
// Adjusted relative path for src/index.js -> ./services/
const clientAgentService = require('./services/clientAgent.service.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function promptUser() {
  rl.question('\nEnter your prompt (or type "exit" to quit):\n> ', async (input) => {
    const prompt = input.trim();
    if (prompt.toLowerCase() === 'exit') {
      console.log('Exiting Client AI Agent.');
      rl.close();
      process.exit(0);
    }

    if (!prompt) {
      return promptUser();
    }

    try {
      // Simulate 30,000,000 tinybars overpayment to test refund audit logic
      await clientAgentService.processUserPrompt(prompt, 30000000);
    } catch (_) {}

    promptUser();
  });
}

async function main() {
  console.log('====================================================');
  console.log('  Autonomous Client AI Agent CLI (zkTLS + x402)  ');
  console.log('====================================================');
  promptUser();
}

main().catch(console.error);