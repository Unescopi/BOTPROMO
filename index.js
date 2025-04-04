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
  
  // Registrar informações detalhadas sobre a requisição
  if (req.url.startsWith('/api')) {
    console.log('=== DETALHES DA REQUISIÇÃO ===');
    console.log('URL:', req.url);
    console.log('Método:', req.method);
    console.log('Headers:', JSON.stringify(req.headers));
    console.log('Query:', JSON.stringify(req.query));
    console.log('Body:', JSON.stringify(req.body));
  }
  
  // Capturar a resposta original para logar depois
  const originalSend = res.send;
  res.send = function(body) {
    if (req.url.startsWith('/api')) {
      console.log('=== DETALHES DA RESPOSTA ===');
      console.log('Status:', res.statusCode);
      console.log('Headers:', JSON.stringify(res._headers));
      
      // Tentar fazer parse do body se for JSON
      try {
        if (typeof body === 'string' && body.startsWith('{')) {
          console.log('Body:', JSON.parse(body));
        } else {
          console.log('Body:', body);
        }
      } catch (e) {
        console.log('Body não pode ser parseado:', body);
      }
    }
    originalSend.apply(res, arguments);
  };
  
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
console.log('=== TENTANDO CONECTAR AO MONGODB ===');
console.log(`URI do MongoDB: ${process.env.MONGODB_URI ? process.env.MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@') : 'MONGODB_URI não definida'}`);

const connectToMongoDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cafeteria-promo-bot', {
      serverSelectionTimeoutMS: 10000, // 10 segundos de timeout para seleção de servidor
      useNewUrlParser: true,
      useUnifiedTopology: true,
      retryWrites: true,
      w: 'majority',
      connectTimeoutMS: 30000, // 30 segundos de timeout para conexão
      socketTimeoutMS: 30000, // 30 segundos de timeout para operações de socket
    });
    
    console.log('=== CONEXÃO COM MONGODB ===');
    console.log('Conectado ao MongoDB com sucesso!');
    console.log(`URI do MongoDB: ${process.env.MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')}`);
    
    // Verificar se podemos acessar as coleções
    const collections = await mongoose.connection.db.listCollections().toArray();
    const clientsCount = await mongoose.connection.db.collection('clients').countDocuments().catch(e => 0);
    const promotionsCount = await mongoose.connection.db.collection('promotions').countDocuments().catch(e => 0);
    const messagesCount = await mongoose.connection.db.collection('messages').countDocuments().catch(e => 0);
    
    console.log('=== COLEÇÕES NO MONGODB ===');
    console.log('Coleções disponíveis:', collections.map(c => c.name).join(', '));
    console.log('Contagem de documentos:');
    console.log(`- Clientes: ${clientsCount}`);
    console.log(`- Promoções: ${promotionsCount}`);
    console.log(`- Mensagens: ${messagesCount}`);
    
    return true;
  } catch (err) {
    console.error('=== ERRO NA CONEXÃO COM MONGODB PRINCIPAL ===');
    console.error('Mensagem de erro:', err.message);
    
    // Tentar conexão alternativa se disponível
    if (process.env.MONGODB_URI_ALT) {
      console.log('=== TENTANDO CONEXÃO ALTERNATIVA COM MONGODB ===');
      try {
        await mongoose.connect(process.env.MONGODB_URI_ALT, {
          serverSelectionTimeoutMS: 10000,
          useNewUrlParser: true,
          useUnifiedTopology: true,
          retryWrites: true,
          connectTimeoutMS: 30000,
          socketTimeoutMS: 30000,
        });
        
        console.log('=== CONEXÃO ALTERNATIVA COM MONGODB BEM-SUCEDIDA ===');
        return true;
      } catch (altErr) {
        console.error('=== ERRO NA CONEXÃO ALTERNATIVA COM MONGODB ===');
        console.error('Mensagem de erro:', altErr.message);
        throw altErr;
      }
    } else {
      throw err;
    }
  }
};

// Iniciar conexão ao MongoDB
connectToMongoDB()
  .catch(err => {
    console.error('=== ERRO FATAL NA CONEXÃO COM MONGODB ===');
    console.error('Mensagem de erro:', err.message);
    console.error('Stack trace:', err.stack);
    console.error('Verifique se as credenciais do MongoDB estão corretas e se o serviço está acessível.');
    console.error('Continuando com funcionalidade limitada (modo fallback).');
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

// Adicionar uma rota de diagnóstico específica
app.get('/api/debug/test', (req, res) => {
  console.log('=== TESTE DE DIAGNÓSTICO ===');
  
  // Verificar conexão com MongoDB
  const dbStatus = mongoose.connection.readyState === 1 ? 'conectado' : 'desconectado';
  
  // Dados para retornar
  const diagnosticData = {
    success: true,
    server: {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      port: PORT
    },
    database: {
      status: dbStatus,
      uri: process.env.MONGODB_URI.replace(/mongodb:\/\/([^:]+):([^@]+)@/, 'mongodb://***:***@')
    },
    request: {
      headers: req.headers,
      ip: req.ip
    }
  };
  
  // Definir cabeçalhos para evitar cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  
  // Enviar resposta
  res.status(200).json(diagnosticData);
});
