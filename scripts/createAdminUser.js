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

console.log('Iniciando script para criar usuário administrador...');
console.log(`Tentando conectar ao MongoDB: ${process.env.MONGODB_URI}`);

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Conectado ao MongoDB com sucesso!');
    
    try {
      // Verifica se já existe um usuário com este email
      const existingUser = await User.findOne({ email: adminUser.email });
      
      if (existingUser) {
        console.log(`Usuário com email ${adminUser.email} já existe. Atualizando...`);
        
        // Atualiza o usuário existente
        existingUser.name = adminUser.name;
        existingUser.role = adminUser.role;
        existingUser.active = true;
        
        // Se uma nova senha foi fornecida, atualiza a senha
        if (adminUser.password) {
          existingUser.password = adminUser.password;
        }
        
        await existingUser.save();
        console.log('Usuário administrador atualizado com sucesso!');
      } else {
        // Cria um novo usuário administrador
        const user = await User.create(adminUser);
        console.log(`Usuário administrador criado com sucesso! ID: ${user._id}`);
      }
      
      // Lista todos os usuários para verificação
      const users = await User.find({}).select('-password');
      console.log('Usuários no banco de dados:');
      console.log(users);
      
      process.exit(0);
    } catch (error) {
      console.error(`Erro ao criar usuário administrador: ${error.message}`);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(`Erro ao conectar ao MongoDB: ${err.message}`);
    process.exit(1);
  });
