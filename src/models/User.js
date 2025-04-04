/**
 * Modelo de usuário para autenticação
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../config/config');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido']
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'operator', 'viewer'],
    default: 'viewer'
  },
  active: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Criptografar senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só executa se a senha foi modificada
  if (!this.isModified('password')) {
    return next();
  }
  
  try {
    // Gera um salt
    const salt = await bcrypt.genSalt(10);
    // Criptografa a senha
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senha
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    return await bcrypt.compare(enteredPassword, this.password);
  } catch (error) {
    console.error('Erro ao comparar senhas:', error);
    return false;
  }
};

// Método para gerar token JWT
userSchema.methods.generateAuthToken = function() {
  try {
    return jwt.sign(
      { 
        id: this._id,
        name: this.name,
        email: this.email,
        role: this.role
      },
      process.env.JWT_SECRET || 'secret-jwt-cafeteria-bot-2025',
      {
        expiresIn: process.env.JWT_EXPIRATION || '7d'
      }
    );
  } catch (error) {
    console.error('Erro ao gerar token JWT:', error);
    throw error;
  }
};

// Método para gerar token de redefinição de senha
userSchema.methods.getResetPasswordToken = function() {
  // Gera token
  const resetToken = crypto.randomBytes(20).toString('hex');

  // Criptografa e define o token de redefinição de senha
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Define o tempo de expiração (10 minutos)
  this.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

module.exports = mongoose.model('User', userSchema);
