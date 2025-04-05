/**
 * Arquivo de configuração das rotas
 */
const express = require('express');
const router = express.Router();

// Importando as rotas específicas
const apiRoutes = require('./api');
const clientRoutes = require('./client');
const messageRoutes = require('./message');
const promotionRoutes = require('./promotion');
const authRoutes = require('./auth');
const webhookRoutes = require('./webhook');
const diagnosticRoutes = require('./diagnostic');
const exportRoutes = require('./export');
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');

// Configurando as rotas - modificando a ordem para evitar sobreposição
// Primeiro registramos as rotas específicas
router.use('/auth', authRoutes); // Removido o prefixo 'api' pois já estamos em '/api'
router.use('/clients', clientRoutes);
router.use('/messages', messageRoutes);
router.use('/promotions', promotionRoutes);
router.use('/webhook', webhookRoutes);
router.use('/diagnostics', diagnosticRoutes);
router.use('/export', exportRoutes);

// Rotas para gerenciamento de mídia
router.post('/media/upload', auth.verifyToken, mediaController.uploadMedia);
router.get('/media/list', auth.verifyToken, mediaController.listMedia);
router.delete('/media/:fileName', auth.verifyToken, mediaController.deleteMedia);

// Por último, registramos as rotas gerais da API
// Isso evita que elas interfiram com as rotas específicas
router.use('/', apiRoutes);

// Adicionar um log para verificar as rotas registradas
console.log('=== ROTAS REGISTRADAS ===');
console.log('Rotas de autenticação:', authRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de clientes:', clientRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de promoções:', promotionRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de mensagens:', messageRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de webhook:', webhookRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de diagnóstico:', diagnosticRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));
console.log('Rotas de exportação:', exportRoutes.stack.map(r => r.route).filter(Boolean).map(r => r.path));

module.exports = router;
