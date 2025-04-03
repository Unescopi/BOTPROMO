require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fileUpload = require('express-fileupload');
const mongoose = require('mongoose');
const logger = require('./src/utils/logger');

// Importando rotas
const routes = require('./src/routes');

// Inicializando o agendador de tarefas
const schedulerService = require('./src/services/schedulerService');

// Inicialização do app Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload({
  limits: { fileSize: process.env.MAX_FILE_SIZE || 5 * 1024 * 1024 }, // 5MB default
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'uploads/temp'),
  createParentPath: true
}));

// Servindo arquivos estáticos
app.use(express.static(path.join(__dirname, 'src/public')));

// Rota específica para servir páginas HTML
app.get('/pages/:page', (req, res) => {
  const pageName = req.params.page;
  const filePath = path.join(__dirname, 'src/public/pages', `${pageName}.html`);
  res.sendFile(filePath);
});

// Conectando ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    logger.info('Conectado ao MongoDB com sucesso!');
  })
  .catch(err => {
    logger.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  });

// Rotas da API
app.use('/api', routes);

// Corrigindo a configuração de rotas para assegurar que as rotas de API funcionem corretamente
app.use('/api/clients', require('./src/routes/client'));
app.use('/api/promotions', require('./src/routes/promotion'));  
app.use('/api/messages', require('./src/routes/message'));

// Adiciona uma rota de fallback para lidar com navegação direta para rotas SPA
app.get('/:page', (req, res) => {
  const allowedPages = ['clients', 'promotions', 'messages', 'settings', 'dashboard'];
  const page = req.params.page;
  
  if (allowedPages.includes(page)) {
    // Se for uma das páginas da aplicação, carrega o index.html
    res.sendFile(path.join(__dirname, 'src/public/index.html'));
  } else {
    // Caso contrário, responde com 404
    res.status(404).send('Página não encontrada');
  }
});

// Rotas de páginas
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/index.html'));
});

app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/login.html'));
});

app.get('/reset-password', (req, res) => {
  res.sendFile(path.join(__dirname, 'src/public/reset-password.html'));
});

// Inicializando o servidor
app.listen(PORT, () => {
  logger.info(`Servidor rodando na porta ${PORT}`);
  
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
