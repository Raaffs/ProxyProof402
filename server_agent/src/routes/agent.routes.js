const { Router } = require('express');
const agentController = require('../controllers/agent.controller.js');

const router = Router();

router.get('/protected/verified', agentController.getProtectedVerified);
router.get('/protected/unverified', agentController.getProtectedUnverified);

module.exports = router;