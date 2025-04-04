/**
 * Script para criar um usuário administrador padrão
 * Execute com: node scripts/createAdminUser.js
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');
const logger = require('../src/utils/logger');

// Configurações do usuário administrador
const adminUser = {
  name: 'Administrador',
  email: 'admin@cafeteriabot.com',
  password: 'Admin@2025',
  role: 'admin'
};

// Usar uma conexão local para desenvolvimento
const localMongoURI = 'mongodb://localhost:27017/cafeteria-promo-bot';

// Conectar ao MongoDB
mongoose.connect(localMongoURI)
  .then(async () => {
    logger.info('Conectado ao MongoDB com sucesso!');
    
    try {
      // Verificar se o usuário já existe
      const existingUser = await User.findOne({ email: adminUser.email });
      
      if (existingUser) {
        logger.info(`Usuário administrador já existe com o email: ${adminUser.email}`);
        logger.info('Você pode fazer login com as credenciais existentes');
        process.exit(0);
      }
      
      // Criar o usuário administrador
      const user = await User.create(adminUser);
      
      logger.info('Usuário administrador criado com sucesso!');
      logger.info('-------------------------------------');
      logger.info('Credenciais de acesso:');
      logger.info(`Email: ${adminUser.email}`);
      logger.info(`Senha: ${adminUser.password}`);
      logger.info('-------------------------------------');
      
      process.exit(0);
    } catch (error) {
      logger.error(`Erro ao criar usuário administrador: ${error.message}`);
      process.exit(1);
    }
  })
  .catch(err => {
    logger.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  });
