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

// Configurando as rotas - adicionando o prefixo 'api' para todas
router.use('/api', apiRoutes);
router.use('/clients', clientRoutes);
router.use('/messages', messageRoutes);
router.use('/promotions', promotionRoutes);
router.use('/auth', authRoutes);

module.exports = router;
