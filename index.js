require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');
const config = require('./src/config/config');

// Verificar se estamos no ambiente EasyPanel
const isEasyPanel = process.env.NODE_ENV === 'production' && 
                    process.env.BASE_URL && 
                    process.env.BASE_URL.includes('easypanel.host');

// Carregar configurações específicas do EasyPanel, se disponíveis
let easyPanelConfig = {};
try {
  easyPanelConfig = require('./easypanel.config');
  logger.info('Configurações do EasyPanel carregadas com sucesso');
} catch (error) {
  logger.info('Configurações específicas do EasyPanel não encontradas, usando configurações padrão');
}

// Importando rotas
const routes = require('./src/routes');

// Inicializando o agendador de tarefas
const schedulerService = require('./src/services/schedulerService');

// Inicialização do app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Configurar trust proxy se estiver no EasyPanel
if (isEasyPanel && easyPanelConfig.proxy && easyPanelConfig.proxy.trustProxy) {
  app.set('trust proxy', 1);
  logger.info('Trust proxy configurado para ambiente EasyPanel');
}

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    console.log('=== REQUISIÇÃO CORS ===');
    console.log('Origem:', origin);
    
    // Permitir requisições sem origem (como aplicativos móveis ou Postman)
    if (!origin) return callback(null, true);
    
    // Verificar se a origem está na lista de permitidas
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://botpromo-cafeteria-bot.pn0lhe.easypanel.host'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      console.error(`Origem não permitida: ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'));
    }
  },
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 }, // 5MB default
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'uploads/temp'),
  createParentPath: true
}));

// Middleware para logging de requisições
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, 'src/public')));

// Rota específica para servir páginas HTML
app.get('/pages/:page', (req, res) => {
  const pageName = req.params.page;
  const filePath = path.join(__dirname, 'src/public/pages', `${pageName}.html`);
  res.sendFile(filePath);
});

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('=== CONEXÃO COM MONGODB ===');
    console.log('Conectado ao MongoDB com sucesso!');
    console.log(`URI do MongoDB: ${process.env.MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')}`);
    
    // Verificar se podemos acessar as coleções
    return Promise.all([
      mongoose.connection.db.listCollections().toArray(),
      mongoose.connection.db.collection('clients').countDocuments(),
      mongoose.connection.db.collection('promotions').countDocuments(),
      mongoose.connection.db.collection('messages').countDocuments()
    ]);
  })
  .then(([collections, clientsCount, promotionsCount, messagesCount]) => {
    console.log('=== COLEÇÕES NO MONGODB ===');
    console.log('Coleções disponíveis:', collections.map(c => c.name).join(', '));
    console.log('Contagem de documentos:');
    console.log(`- Clientes: ${clientsCount}`);
    console.log(`- Promoções: ${promotionsCount}`);
    console.log(`- Mensagens: ${messagesCount}`);
  })
  .catch(err => {
    console.error('=== ERRO NA CONEXÃO COM MONGODB ===');
    console.error('Mensagem de erro:', err.message);
    console.error('Stack trace:', err.stack);
  });

// Rotas da API
app.use('/api', routes);
console.log('=== PREFIXO DA API ===');
console.log('Prefixo configurado: /api');

// Adicione este código para listar todas as rotas registradas
app.get('/api/routes', (req, res) => {
  const routesList = [];
  app._router.stack.forEach(middleware => {
    if (middleware.route) {
      // Rotas registradas diretamente
      routesList.push({
        path: middleware.route.path,
        methods: Object.keys(middleware.route.methods)
      });
    } else if (middleware.name === 'router') {
      // Rotas registradas via router
      middleware.handle.stack.forEach(handler => {
        if (handler.route) {
          routesList.push({
            path: handler.route.path,
            methods: Object.keys(handler.route.methods)
          });
        }
      });
    }
  });
  res.json(routesList);
});

// Adiciona uma rota de fallback para lidar com navegação direta para rotas SPA
app.get('/:page', (req, res) => {
  const allowedPages = ['clients', 'promotions', 'messages', 'settings', 'dashboard'];
  const page = req.params.page;
  
  if (allowedPages.includes(page)) {
    // Se for uma das páginas da aplicação, carrega o index.html
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
  } else if (page === 'login') {
    // Rota específica para login
    res.sendFile(path.join(__dirname, 'src/public/login.html'));
  } else if (page === 'reset-password') {
    // Rota específica para redefinição de senha
    res.sendFile(path.join(__dirname, 'src/public/reset-password.html'));
  } else {
    // Caso contrário, responde com 404
    res.status(404).send('Página não encontrada');
  }
});

// Rotas de páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

// Estas rotas são redundantes com a lógica acima, mas mantidas para compatibilidade
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/login.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/reset-password.html'));
});

// Adicione este middleware após registrar as rotas da API
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint não encontrado'
  });
});

// Adicione este middleware para tratar erros na API
app.use((err, req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.error('Erro na API:', err);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  } else {
    next(err);
  }
});

// Verificar dependências
const dependencyChecker = require('./src/utils/dependencyChecker');
dependencyChecker.checkDependencies();

// Inicializando o servidor
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  logger.info(`Ambiente: ${process.env.NODE_ENV || 'development'}`);
  
  if (isEasyPanel) {
    logger.info(`Servidor configurado para o domínio: ${config.server.domain}`);
  }
  
  // Bot configurado para operar apenas via webhook
  logger.info('Bot de Promoções inicializado no modo webhook');
  logger.info(`Configure a URL do webhook no painel da Evolution API: ${process.env.BASE_URL || 'http://seu-dominio.com'}/api/webhook`);
  
  // Inicializando o agendador de tarefas
  schedulerService.initScheduler();
  logger.info('Agendador de tarefas inicializado com sucesso!');
});

// Tratamento de erros não capturados
process.on('uncaughtException', (error) => {
  logger.error(`Erro não capturado: ${error.message}`);
  logger.error(error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promessa rejeitada não tratada:');
  logger.error(reason);
});
