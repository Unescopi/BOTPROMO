/**
 * Configuração específica para o ambiente EasyPanel
 * Este arquivo contém ajustes específicos para o funcionamento no ambiente de hospedagem EasyPanel
 */

module.exports = {
  // Configurações de domínio
  domain: {
    name: 'botpromo-cafeteria-bot.pn0lhe.easypanel.host',
    protocol: 'https',
    fullUrl: 'https://botpromo-cafeteria-bot.pn0lhe.easypanel.host'
  },
  
  // Configurações de proxy
  proxy: {
    // O EasyPanel usa um proxy reverso, então precisamos confiar nos cabeçalhos X-Forwarded-*
    trustProxy: true
  },
  
  // Configurações de segurança
  security: {
    // Configurações de CORS para o domínio
    cors: {
      origin: ['https://botpromo-cafeteria-bot.pn0lhe.easypanel.host'],
      credentials: true
    }
  },
  
  // Configurações de log
  logging: {
    // Nível de log para ambiente de produção
    level: 'info',
    // Formato de data para logs
    dateFormat: 'DD/MM/YYYY HH:mm:ss'
  }
};
