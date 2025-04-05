/**
 * Rotas para diagnósticos do sistema
 */
const express = require('express');
const router = express.Router();
const diagnosticController = require('../controllers/diagnosticController');
const auth = require('../middleware/auth');

// Rotas protegidas para administração
router.get('/run', auth.verifyToken, auth.isAdmin, diagnosticController.runDiagnostics);
router.get('/report', auth.verifyToken, auth.isAdmin, diagnosticController.generateReport);
router.get('/database', auth.verifyToken, auth.isAdmin, diagnosticController.checkDatabase);
router.get('/whatsapp', auth.verifyToken, auth.isAdmin, diagnosticController.checkWhatsApp);
router.get('/filesystem', auth.verifyToken, auth.isAdmin, diagnosticController.checkFileSystem);

module.exports = router; 