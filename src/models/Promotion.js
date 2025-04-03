/**
 * Modelo de Promoção para gerenciar campanhas e promoções
 */
const mongoose = require('mongoose');

const promotionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da promoção é obrigatório'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Descrição da promoção é obrigatória'],
    trim: true
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'special', 'flash', 'birthday', 'custom'],
    default: 'custom'
  },
  messageTemplate: {
    type: String,
    required: [true, 'Template da mensagem é obrigatório']
  },
  mediaUrls: [{
    type: String,
    trim: true
  }],
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Data de início é obrigatória']
    },
    endDate: {
      type: Date
    },
    cronExpression: {
      type: String,
      trim: true
    },
    sendTime: {
      type: String,
      trim: true
    },
    recurrence: {
      type: String,
      enum: ['once', 'daily', 'weekly', 'monthly', 'custom'],
      default: 'once'
    }
  },
  targeting: {
    allClients: {
      type: Boolean,
      default: false
    },
    includeTags: [{
      type: String,
      trim: true
    }],
    excludeTags: [{
      type: String,
      trim: true
    }],
    frequencyMin: {
      type: Number,
      min: 0
    },
    frequencyMax: {
      type: Number
    },
    lastVisitDays: {
      type: Number
    },
    customFilter: {
      type: String
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft'
  },
  metrics: {
    totalRecipients: {
      type: Number,
      default: 0
    },
    messagesSent: {
      type: Number,
      default: 0
    },
    messagesDelivered: {
      type: Number,
      default: 0
    },
    messagesRead: {
      type: Number,
      default: 0
    },
    clicksCount: {
      type: Number,
      default: 0
    },
    responseCount: {
      type: Number,
      default: 0
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
promotionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Índices
promotionSchema.index({ 'schedule.startDate': 1 });
promotionSchema.index({ status: 1 });
promotionSchema.index({ type: 1 });

const Promotion = mongoose.model('Promotion', promotionSchema);

module.exports = Promotion;
