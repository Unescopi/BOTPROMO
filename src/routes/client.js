/**
 * Rotas para gerenciamento de clientes
 */
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

// Rota para importação de clientes via CSV
router.post('/import', clientController.importClients);

// Rota para exportação de clientes para CSV
router.get('/export', clientController.exportClients);

// Rotas para gerenciamento de tags
router.get('/tags', clientController.getTags);
router.post('/tags/bulk', clientController.addTagToMany);

// Rota para estatísticas
router.get('/stats', clientController.getStats);

// Rotas CRUD básicas
router.get('/', clientController.getClients);
router.post('/', clientController.createClient);
router.get('/:id', clientController.getClient);
router.put('/:id', clientController.updateClient);
router.delete('/:id', clientController.deleteClient);

module.exports = router;
