/**
 * Sistema de logs centralizado
 */
const pino = require('pino');
const config = require('../config/config');

// Configuração do Pino Logger
const logger = pino({
  level: config.logs.level,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  },
  base: {
    app: 'cafeteria-promo-bot',
  },
});

module.exports = logger;
