const express = require('express');
const app = express();

app.get('/status', (req, res) => {
  res.json({ status: 'active', timestamp: Date.now() });
});

const PORT = 3000;

const server = app.listen(PORT, () => {
  console.log(`Local Server listening on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('[Server Error]:', err.message);
});