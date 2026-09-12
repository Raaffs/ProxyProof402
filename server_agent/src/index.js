const express = require('express');
const cors = require('cors');
const env = require('./config/env.js');
const agentRoutes = require('./routes/agent.routes.js');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', agentRoutes);

app.listen("8000", () => {
  console.log(`🚀 Server Agent active on http://localhost:8000`);
  console.log(`📌 Payee Account: ${env.payeeAccount}`);
});