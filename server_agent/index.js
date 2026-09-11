const express = require('express');
const cors = require('cors');
const { ReclaimClient } = require('@reclaimprotocol/zk-fetch');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Reclaim Client with App ID and Secret
const reclaimClient = new ReclaimClient(
  process.env.RECLAIM_APP_ID,
  process.env.RECLAIM_APP_SECRET
);

console.log(  process.env.RECLAIM_APP_ID,
  process.env.RECLAIM_APP_SECRET
)
app.post('/api/agent/query', async (req, res) => {
  try {
    const { prompt = 'hello' } = req.body;
    const geminiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent';
    // 1. Public parameters (Included and verified in the ZK proof)
    const publicOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    };

    // 2. Private parameters (Redacted & hidden from the proof)
    const privateOptions = {
      headers: {
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
    };

    console.log(`[Server Agent] Fetching Gemini response via zkFetch for prompt: "${prompt}"...`);

    // Execute call through Reclaim Witness and generate cryptographic ZK proof
    const proof = await reclaimClient.zkFetch(
      geminiUrl,
      publicOptions,
      privateOptions
    );

    console.log('[Server Agent] ZK Proof generated successfully.');

    res.json({
      success: true,
      prompt,
      proof,
    });
  } catch (error) {
    console.error('[Server Agent Error]:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
  console.log(`Server Agent active at http://localhost:${PORT}`);
});