/**
 * Rotas para gerenciamento de clientes
 */
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const auth = require('../middleware/auth');

// Log de debug para rastrear todas as chamadas à API de clientes
router.use((req, res, next) => {
  console.log(`=== ROTA DE CLIENTES ACESSADA ===`);
  console.log(`Método: ${req.method}, URL: ${req.originalUrl}`);
  console.log(`Query params:`, req.query);
  console.log(`Headers:`, req.headers);
  next();
});

// Rota para obter dados de demonstração (não requer autenticação)
router.get('/demo', (req, res) => {
  console.log('=== ROTA DE DEMONSTRAÇÃO ACESSADA ===');
  
  // Gerar 10 clientes de demonstração
  const demoClients = [];
  for (let i = 1; i <= 10; i++) {
    demoClients.push({
      _id: `demo-${i}`,
      name: `Cliente Demonstração ${i}`,
      phone: `5511999999${i.toString().padStart(2, '0')}`,
      email: `cliente${i}@exemplo.com`,
      status: i % 5 === 0 ? 'inactive' : 'active',
      tags: ['demo', i % 2 === 0 ? 'vip' : 'regular'],
      lastVisit: new Date(Date.now() - (i * 86400000)) // Dias decrescentes
    });
  }
  
  return res.status(200).json({
    success: true,
    message: "Dados de demonstração",
    data: demoClients
  });
});

// Todas as rotas a seguir usam autenticação, exceto em ambiente de desenvolvimento
const authMiddleware = process.env.NODE_ENV === 'development' ? (req, res, next) => next() : auth.verifyToken;

// Rotas protegidas
router.post('/', authMiddleware, (req, res, next) => {
  console.log('=== REQUISIÇÃO POST /clients ===');
  console.log('Body:', req.body);
  console.log('User ID:', req.user?.id);
  next();
}, clientController.createClient);

router.get('/', authMiddleware, (req, res, next) => {
  console.log('=== REQUISIÇÃO GET /clients ===');
  console.log('Query params:', req.query);
  console.log('User ID:', req.user?.id);
  
  // Verificar se a requisição tem header de accept e content-type válidos
  console.log('Headers Accept:', req.headers.accept);
  console.log('Headers Content-Type:', req.headers['content-type']);
  
  // Adicionar headers explícitos para CORS
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  next();
}, clientController.getClients);

router.get('/:id', authMiddleware, clientController.getClient);
router.put('/:id', authMiddleware, clientController.updateClient);
router.delete('/:id', authMiddleware, clientController.deleteClient);

// Rotas adicionais
router.post('/batch', authMiddleware, clientController.batchOperation);
router.post('/import', authMiddleware, clientController.importClients);
router.get('/export', authMiddleware, clientController.exportClients);
router.get('/tags', authMiddleware, clientController.getTags);
router.post('/tags/bulk', authMiddleware, clientController.addTagToMany);
router.get('/stats', authMiddleware, clientController.getStats);

module.exports = router;

