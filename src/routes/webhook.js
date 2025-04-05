/**
 * Rotas para gerenciamento de webhooks
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const auth = require('../middleware/auth');

// Rota principal para receber webhooks da Evolution API
router.post('/', webhookController.handleWebhook);

// Rotas protegidas para administração
router.get('/stats', auth.verifyToken, webhookController.getWebhookStats);
router.get('/events/recent', auth.verifyToken, webhookController.getRecentEvents);
router.get('/formats', auth.verifyToken, webhookController.getMessageFormats);

module.exports = router; 