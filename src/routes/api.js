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

// Rota de teste para envio de mensagem
router.post('/send-test', async (req, res) => {
  try {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Telefone e mensagem são obrigatórios' 
      });
    }
    
    // Importa o serviço da Evolution API
    const evolutionApi = require('../services/evolutionApi');
    
    // Envia a mensagem de teste
    const result = await evolutionApi.sendTextMessage(phone, message);
    
    if (result.success) {
      return res.status(200).json({
        success: true,
        message: 'Mensagem enviada com sucesso',
        messageId: result.messageId
      });
    } else {
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Erro ao enviar mensagem de teste:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao enviar mensagem',
      error: error.message
    });
  }
});

// Rotas de conexão com WhatsApp
router.get('/whatsapp/status', messageController.checkConnection);
router.get('/whatsapp/qrcode', messageController.getQRCode);
router.post('/whatsapp/disconnect', messageController.disconnect);

module.exports = router;
