/**
 * Modelo de Cliente para armazenar os contatos
 */
const mongoose = require('mongoose');
const validator = require('../utils/validator');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do cliente é obrigatório'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Número de telefone é obrigatório'],
    unique: true,
    validate: {
      validator: function(v) {
        return validator.isValidPhone(v);
      },
      message: props => `${props.value} não é um número de telefone válido!`
    }
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Por favor, forneça um email válido']
  },
  tags: [{
    type: String,
    trim: true
  }],
  preferences: {
    type: Map,
    of: Boolean,
    default: {
      dailyPromos: true,
      weeklyPromos: true,
      specialEvents: true
    }
  },
  birthday: {
    type: Date
  },
  lastVisit: {
    type: Date,
    default: Date.now
  },
  frequencyScore: {
    type: Number,
    default: 0
  },
  notes: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['import', 'manual', 'signup'],
    default: 'manual'
  },
  importedAt: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware para atualizar o campo updatedAt
clientSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Garante que o número de telefone está formatado
  if (this.phone) {
    this.phone = validator.formatPhone(this.phone);
  }
  
  console.log('=== PRE-SAVE: Cliente ===');
  console.log('Dados do cliente a serem salvos:', JSON.stringify(this.toObject(), null, 2));
  
  next();
});

// Índices
// Removendo o índice duplicado de phone, pois já está definido como unique: true no schema
clientSchema.index({ tags: 1 });
clientSchema.index({ status: 1 });

// Adicionar um middleware post-save para logar os dados após salvar
clientSchema.post('save', function(doc) {
  console.log('=== POST-SAVE: Cliente ===');
  console.log('Cliente salvo com sucesso. ID:', doc._id);
  console.log('Dados do cliente salvos:', JSON.stringify(doc.toObject(), null, 2));
});

const Client = mongoose.model('Client', clientSchema);

module.exports = Client;
