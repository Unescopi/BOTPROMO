/**
 * Configurações centralizadas do aplicativo
 */
require('dotenv').config();

module.exports = {
  // Configurações do servidor
  server: {
    port: process.env.PORT || 3000,
    environment: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'http://localhost:3001',
    domain: new URL(process.env.BASE_URL || 'http://localhost:3001').hostname
  },
  
  // Configurações do MongoDB
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/cafeteria-promo-bot',
  },
  
  // Configurações de Webhook
  webhook: {
    enabled: process.env.WEBHOOK_ENABLED === 'true',
    secret: process.env.WEBHOOK_SECRET || 'webhook-default-secret',
    path: '/api/webhook'
  },
  
  // Configurações JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'sua_chave_jwt_segura',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  
  // Chave JWT para uso direto
  jwtSecret: process.env.JWT_SECRET || 'sua_chave_jwt_segura',
  
  // Configurações de upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024, // 5MB default
    allowedImageExtensions: ['.jpg', '.jpeg', '.png', '.gif'],
    allowedDocumentExtensions: ['.pdf', '.doc', '.docx', '.xls', '.xlsx'],
  },
  
  // Configurações de logs
  logs: {
    level: process.env.LOG_LEVEL || 'info',
  },
  
  // Configurações de mensagens
  messaging: {
    maxRecipients: 100, // Número máximo de destinatários por lote
    batchSize: 20, // Número de mensagens a serem enviadas por lote
    delayBetweenBatches: 1000, // Delay entre lotes (em ms)
    dailyLimit: 1000, // Limite diário de mensagens
  },
  
  // Configurações de agendamento
  scheduler: {
    timezone: 'America/Sao_Paulo',
    dailyPromoTime: '10:00', // Horário para envio de promoções diárias
    weeklyPromoDay: 1, // Segunda-feira (0 = Domingo, 1 = Segunda, ...)
    weeklyPromoTime: '12:00', // Horário para envio de promoções semanais
  }
};
