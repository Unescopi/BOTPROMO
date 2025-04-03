/**
 * Rotas para gerenciamento de promoções
 */
const express = require('express');
const router = express.Router();
const promoController = require('../controllers/promoController');
const auth = require('../middleware/auth');

// Aplicar middleware de autenticação em todas as rotas
router.use(auth.verifyToken);

// Rota para upload de mídia
router.post('/upload-media', promoController.uploadMedia);

// Rotas para agendamento e envio
router.post('/:id/schedule', promoController.schedulePromotion);
router.post('/:id/send', promoController.sendPromotion);
router.post('/:id/cancel', promoController.cancelPromotion);
router.post('/:id/test', promoController.testPromotion);

// Rota para métricas
router.get('/:id/metrics', promoController.getPromotionMetrics);

// Rota para estatísticas
router.get('/stats', promoController.getStats);

// Rotas para dashboard
router.get('/recent', promoController.getRecentPromotions);
router.get('/upcoming', promoController.getUpcomingPromotions);

// Rotas CRUD básicas
router.get('/', promoController.getPromotions);
router.post('/', promoController.createPromotion);
router.get('/:id', promoController.getPromotion);
router.put('/:id', promoController.updatePromotion);
router.delete('/:id', promoController.deletePromotion);

module.exports = router;
