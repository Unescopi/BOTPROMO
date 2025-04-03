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

// Inicializando o serviço da Evolution API
const evolutionApiService = require('./src/services/evolutionApi');

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
  const filePath = path.join(__dirname, 'src/public/pages', pageName);
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
  
  // Inicializando conexão com a Evolution API
  evolutionApiService.checkConnection()
    .then(connected => {
      if (connected) {
        logger.info('Conectado à Evolution API com sucesso!');
      } else {
        logger.warn('Não foi possível conectar à Evolution API. Verifique suas configurações.');
      }
    })
    .catch(err => {
      logger.error(`Erro ao conectar com a Evolution API: ${err.message}`);
    });
  
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
