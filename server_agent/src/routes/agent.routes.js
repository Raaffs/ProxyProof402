const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller.js');

// --- Gemini Endpoints ---
router.get('/protected/verified/gemini', agentController.getGeminiVerified);
router.get('/protected/unverified/gemini', agentController.getGeminiUnverified);

module.exports = router;