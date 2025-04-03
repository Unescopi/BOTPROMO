/**
 * Rotas para gerenciamento de mensagens
 */
const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const auth = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(auth.verifyToken);

// Rotas para envio de mensagens
router.post('/send', messageController.sendMessage);
router.post('/send-bulk', messageController.sendBulkMessages);

// Rota para reenvio de mensagem
router.post('/:id/resend', messageController.resendMessage);

// Rota para exclusão de mensagem
router.delete('/:id', messageController.deleteMessage);

// Rota para atualização de status
router.put('/:id/status', messageController.updateMessageStatus);

// Rota para estatísticas
router.get('/stats', messageController.getStats);

// Rotas CRUD básicas
router.get('/', messageController.getMessages);
router.get('/:id', messageController.getMessage);

module.exports = router;
