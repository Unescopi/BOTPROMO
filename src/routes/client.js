/**
 * Rotas para gerenciamento de clientes
 */
const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { authenticateToken } = require('../middleware/authMiddleware');
const app = require('../app');

// Log de debug para rastrear todas as chamadas à API de clientes
router.use((req, res, next) => {
  console.log(`=== ROTA CLIENTE ===> ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  console.log('Headers:', req.headers);
  next();
});

// Rotas públicas para debug (temporárias)
router.get('/test', (req, res) => {
  res.json({ message: 'API de clientes está funcionando', timestamp: new Date().toISOString() });
});

// Rota de exemplo para depuração
router.get('/demo', (req, res) => {
  console.log('=== REQUISIÇÃO GET /clients/demo ===');
  // Verificar se o módulo app existe e tem o método getDebugClients
  if (app && typeof app.getDebugClients === 'function') {
    const demoData = app.getDebugClients();
    console.log(`Retornando ${demoData.data.length} clientes de exemplo`);
    return res.status(200).json(demoData);
  } else {
    console.log('Gerando dados manualmente');
    // Dados de exemplo embutidos como fallback
    const demoClients = [];
    for (let i = 1; i <= 5; i++) {
      demoClients.push({
        _id: `demo-${i}`,
        name: `Cliente Exemplo ${i}`,
        phone: `55119999999${i}`,
        email: `cliente${i}@exemplo.com`,
        status: 'active',
        tags: ['demo'],
        lastVisit: new Date()
      });
    }
    return res.status(200).json({
      success: true, 
      message: 'Dados de demonstração', 
      data: demoClients
    });
  }
});

// Todas as rotas a seguir usam autenticação, exceto em ambiente de desenvolvimento
const auth = process.env.NODE_ENV === 'development' ? (req, res, next) => next() : authenticateToken;

// Rotas protegidas
router.post('/', auth, (req, res, next) => {
  console.log('=== REQUISIÇÃO POST /clients ===');
  console.log('Body:', req.body);
  console.log('User ID:', req.user?.id);
  next();
}, clientController.createClient);

router.get('/', auth, (req, res, next) => {
  console.log('=== REQUISIÇÃO GET /clients ===');
  console.log('Query params:', req.query);
  console.log('User ID:', req.user?.id);
  console.log('Headers:', req.headers);
  console.log('URL completa:', req.originalUrl);
  
  // Adicionar cabeçalhos para evitar cache e permitir CORS
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  next();
}, clientController.getClients);

router.get('/:id', auth, clientController.getClient);
router.put('/:id', auth, clientController.updateClient);
router.delete('/:id', auth, clientController.deleteClient);

// Rotas adicionais
router.post('/batch', auth, clientController.batchOperation);
router.post('/import', auth, clientController.importClients);
router.get('/export', auth, clientController.exportClients);
router.get('/tags', auth, clientController.getTags);
router.post('/tags/bulk', auth, clientController.addTagToMany);
router.get('/stats', auth, clientController.getStats);

module.exports = router;
