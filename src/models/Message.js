/**
 * Modelo de Mensagem para registrar todas as mensagens enviadas
 */
const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: true
  },
  promotion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Promotion'
  },
  content: {
    type: String,
    required: true
  },
  mediaUrls: [{
    type: String
  }],
  messageType: {
    type: String,
    enum: ['text', 'image', 'document', 'mixed'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['queued', 'sent', 'delivered', 'read', 'failed'],
    default: 'queued'
  },
  deliveryInfo: {
    sentAt: Date,
    deliveredAt: Date,
    readAt: Date,
    error: String
  },
  waId: {
    type: String,
    trim: true
  },
  scheduledAt: {
    type: Date
  },
  sentAt: {
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
messageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices
messageSchema.index({ client: 1 });
messageSchema.index({ promotion: 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ createdAt: 1 });
messageSchema.index({ scheduledAt: 1 });

const Message = mongoose.model('Message', messageSchema);

module.exports = Message;
