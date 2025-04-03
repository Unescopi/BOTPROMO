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
const mediaController = require('../controllers/mediaController');
const auth = require('../middleware/auth');

// Configurando as rotas - adicionando o prefixo 'api' para todas
router.use('/api', apiRoutes);
router.use('/api/clients', clientRoutes);
router.use('/api/messages', messageRoutes);
router.use('/api/promotions', promotionRoutes);
router.use('/api/auth', authRoutes);

// Rotas para gerenciamento de mídia
router.post('/api/media/upload', auth.verifyToken, mediaController.uploadMedia);
router.get('/api/media/list', auth.verifyToken, mediaController.listMedia);
router.delete('/api/media/:fileName', auth.verifyToken, mediaController.deleteMedia);

module.exports = router;
