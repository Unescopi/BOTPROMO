/**
 * Rotas principais da API
 */
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const webhookController = require('../controllers/webhookController');

// Rota de status
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API em funcionamento',
    timestamp: new Date(),
    version: '1.0.0'
  });
});

// Webhook da Evolution API
router.post('/webhook', webhookController.handleWebhook);

// Rotas de conexão com WhatsApp
router.get('/whatsapp/status', messageController.checkConnection);
router.get('/whatsapp/qrcode', messageController.getQRCode);
router.post('/whatsapp/disconnect', messageController.disconnect);

module.exports = router;
