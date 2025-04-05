/**
 * Rotas para exportação de dados
 */
const express = require('express');
const router = express.Router();
const exportController = require('../controllers/exportController');
const auth = require('../middleware/auth');

// Rotas protegidas para administração
router.get('/clients/json', auth.verifyToken, auth.isAdmin, exportController.exportClientsToJson);
router.get('/clients/csv', auth.verifyToken, auth.isAdmin, exportController.exportClientsToCsv);
router.get('/clients/excel', auth.verifyToken, auth.isAdmin, exportController.exportClientsToExcel);
router.get('/promotions/json', auth.verifyToken, auth.isAdmin, exportController.exportPromotionsToJson);
router.get('/messages/json', auth.verifyToken, auth.isAdmin, exportController.exportMessagesToJson);
router.get('/backup', auth.verifyToken, auth.isAdmin, exportController.createFullBackup);

module.exports = router; 