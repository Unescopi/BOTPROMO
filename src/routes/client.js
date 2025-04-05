/**
 * Rotas para gerenciamento de clientes
 */
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');

// Log para verificar se as rotas estão sendo registradas
console.log('Registrando rotas de clientes:');
console.log('POST /clients - Criar cliente');
console.log('GET /clients - Listar clientes');
console.log('GET /clients/:id - Obter cliente por ID');
console.log('PUT /clients/:id - Atualizar cliente');
console.log('DELETE /clients/:id - Excluir cliente');

// Rotas protegidas
router.post('/', auth.verifyToken, (req, res, next) => {
  console.log('=== REQUISIÇÃO POST /clients ===');
  console.log('Body:', req.body);
  console.log('User ID:', req.user?.id);
  next();
}, clientController.createClient);

router.get('/', auth.verifyToken, (req, res, next) => {
  console.log('=== REQUISIÇÃO GET /clients ===');
  console.log('Query params:', req.query);
  console.log('User ID:', req.user?.id);
  next();
}, clientController.getClients);

router.get('/:id', auth.verifyToken, clientController.getClient);
router.put('/:id', auth.verifyToken, clientController.updateClient);
router.delete('/:id', auth.verifyToken, clientController.deleteClient);

// Rotas adicionais
router.post('/batch', auth.verifyToken, clientController.batchOperation);
router.post('/import', auth.verifyToken, clientController.importClients);
router.get('/export', auth.verifyToken, clientController.exportClients);
router.get('/tags', auth.verifyToken, clientController.getTags);
router.post('/tags/bulk', auth.verifyToken, clientController.addTagToMany);
router.get('/stats', auth.verifyToken, clientController.getStats);

module.exports = router;
