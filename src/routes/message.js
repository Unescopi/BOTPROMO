/**
 * Rotas para gerenciamento de mensagens
 */
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');

// Rotas para envio de mensagens
router.post('/send', messageController.sendMessage);
router.post('/send-bulk', messageController.sendBulkMessages);

// Rota para atualização de status
router.put('/:id/status', messageController.updateMessageStatus);

// Rota para estatísticas
router.get('/stats', messageController.getStats);

// Rotas CRUD básicas
router.get('/', messageController.getMessages);
router.get('/:id', messageController.getMessage);

module.exports = router;
