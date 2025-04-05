/**
 * Módulo de Monitoramento de Webhooks da Evolution API
 * 
 * Este módulo registra e analisa todas as requisições recebidas da Evolution API
 * via webhook, permitindo entender o formato das mensagens e como configurar
 * corretamente o envio de mensagens.
 */
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

class WebhookMonitor {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs/webhooks');
    this.ensureLogDirectory();
    this.eventTypes = new Set();
    this.messageFormats = {};
    this.lastEvents = [];
    this.maxLastEvents = 50;
    
    logger.info('Módulo de Monitoramento de Webhooks inicializado');
  }
  
  /**
   * Garante que o diretório de logs existe
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      logger.info(`Diretório de logs de webhooks criado: ${this.logDir}`);
    }
  }
  
  /**
   * Registra um evento de webhook recebido
   * @param {Object} req - Objeto de requisição Express
   * @param {Object} body - Corpo da requisição já parseado
   */
  logWebhookEvent(req, body) {
    try {
      // Extrair informações importantes
      const timestamp = new Date();
      const ip = req.ip || req.connection.remoteAddress;
      const headers = req.headers;
      const method = req.method;
      const path = req.path;
      
      // Identificar o tipo de evento
      const eventType = this.identifyEventType(body);
      this.eventTypes.add(eventType);
      
      // Criar objeto de evento
      const event = {
        timestamp,
        ip,
        method,
        path,
        eventType,
        headers,
        body
      };
      
      // Adicionar à lista de eventos recentes
      this.addToRecentEvents(event);
      
      // Registrar no arquivo de log
      this.writeToLogFile(event);
      
      // Analisar formato da mensagem se for um evento de mensagem
      if (eventType.includes('message')) {
        this.analyzeMessageFormat(body);
      }
      
      // Log no console
      logger.info(`Webhook recebido: ${eventType}`);
      logger.debug(`Detalhes do webhook: ${JSON.stringify({
        timestamp: timestamp.toISOString(),
        ip,
        method,
        path,
        eventType,
        bodyPreview: this.getBodyPreview(body)
      })}`);
      
      return eventType;
    } catch (error) {
      logger.error(`Erro ao registrar evento de webhook: ${error.message}`);
      logger.error(error.stack);
    }
  }
  
  /**
   * Identifica o tipo de evento com base no corpo da requisição
   * @param {Object} body - Corpo da requisição
   * @returns {String} - Tipo de evento identificado
   */
  identifyEventType(body) {
    if (!body) return 'unknown';
    
    // Verificar se é um evento de status de mensagem
    if (body.status && body.id) {
      return `message_status_${body.status}`;
    }
    
    // Verificar se é uma mensagem recebida
    if (body.key && body.key.remoteJid && body.message) {
      if (body.key.fromMe) {
        return 'message_sent';
      } else {
        return 'message_received';
      }
    }
    
    // Verificar se é um evento de conexão
    if (body.event && body.event.includes('connection')) {
      return body.event;
    }
    
    // Verificar se é um evento de QR Code
    if (body.qrcode) {
      return 'qrcode_updated';
    }
    
    // Verificar se é um evento de status da instância
    if (body.instance && body.status) {
      return `instance_${body.status}`;
    }
    
    // Evento desconhecido
    return `unknown_${Object.keys(body).join('_')}`;
  }
  
  /**
   * Adiciona um evento à lista de eventos recentes
   * @param {Object} event - Evento a ser adicionado
   */
  addToRecentEvents(event) {
    this.lastEvents.unshift(event);
    
    // Manter apenas os últimos N eventos
    if (this.lastEvents.length > this.maxLastEvents) {
      this.lastEvents = this.lastEvents.slice(0, this.maxLastEvents);
    }
  }
  
  /**
   * Escreve o evento em um arquivo de log
   * @param {Object} event - Evento a ser registrado
   */
  writeToLogFile(event) {
    try {
      const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const logFile = path.join(this.logDir, `webhook_${date}.log`);
      
      const logEntry = JSON.stringify({
        timestamp: event.timestamp.toISOString(),
        ip: event.ip,
        method: event.method,
        path: event.path,
        eventType: event.eventType,
        headers: event.headers,
        body: event.body
      }, null, 2);
      
      fs.appendFileSync(logFile, logEntry + ',\n');
    } catch (error) {
      logger.error(`Erro ao escrever log de webhook: ${error.message}`);
    }
  }
  
  /**
   * Analisa o formato da mensagem para entender a estrutura
   * @param {Object} body - Corpo da requisição
   */
  analyzeMessageFormat(body) {
    try {
      if (!body || !body.key) return;
      
      const messageType = this.getMessageType(body);
      
      if (!this.messageFormats[messageType]) {
        this.messageFormats[messageType] = {
          example: body,
          count: 1,
          fields: this.extractFields(body)
        };
      } else {
        this.messageFormats[messageType].count++;
        
        // Atualizar campos se encontrarmos novos
        const newFields = this.extractFields(body);
        this.messageFormats[messageType].fields = {
          ...this.messageFormats[messageType].fields,
          ...newFields
        };
      }
    } catch (error) {
      logger.error(`Erro ao analisar formato de mensagem: ${error.message}`);
    }
  }
  
  /**
   * Obtém o tipo de mensagem
   * @param {Object} body - Corpo da requisição
   * @returns {String} - Tipo de mensagem
   */
  getMessageType(body) {
    if (!body.message) return 'unknown';
    
    // Verificar tipos de mensagem
    if (body.message.conversation) return 'text';
    if (body.message.imageMessage) return 'image';
    if (body.message.videoMessage) return 'video';
    if (body.message.audioMessage) return 'audio';
    if (body.message.documentMessage) return 'document';
    if (body.message.stickerMessage) return 'sticker';
    if (body.message.contactMessage) return 'contact';
    if (body.message.locationMessage) return 'location';
    
    return 'other';
  }
  
  /**
   * Extrai campos importantes da mensagem
   * @param {Object} body - Corpo da requisição
   * @returns {Object} - Campos extraídos
   */
  extractFields(body) {
    const fields = {};
    
    try {
      // Campos comuns
      if (body.key) {
        fields.remoteJid = body.key.remoteJid;
        fields.fromMe = body.key.fromMe;
        fields.id = body.key.id;
      }
      
      // Campos específicos por tipo de mensagem
      if (body.message) {
        if (body.message.conversation) {
          fields.textContent = body.message.conversation;
        } else if (body.message.imageMessage) {
          fields.caption = body.message.imageMessage.caption;
          fields.mimetype = body.message.imageMessage.mimetype;
          fields.url = body.message.imageMessage.url;
        } else if (body.message.videoMessage) {
          fields.caption = body.message.videoMessage.caption;
          fields.mimetype = body.message.videoMessage.mimetype;
          fields.url = body.message.videoMessage.url;
        }
      }
    } catch (error) {
      logger.error(`Erro ao extrair campos: ${error.message}`);
    }
    
    return fields;
  }
  
  /**
   * Obtém uma prévia do corpo da requisição para logs
   * @param {Object} body - Corpo da requisição
   * @returns {Object} - Prévia do corpo
   */
  getBodyPreview(body) {
    if (!body) return {};
    
    const preview = {};
    
    // Adicionar campos principais
    if (body.key) {
      preview.key = {
        remoteJid: body.key.remoteJid,
        fromMe: body.key.fromMe,
        id: body.key.id
      };
    }
    
    // Adicionar tipo de mensagem
    if (body.message) {
      preview.messageType = Object.keys(body.message)[0];
    }
    
    // Adicionar status se existir
    if (body.status) {
      preview.status = body.status;
    }
    
    return preview;
  }
  
  /**
   * Obtém estatísticas sobre os eventos recebidos
   * @returns {Object} - Estatísticas
   */
  getStats() {
    return {
      totalEventTypes: this.eventTypes.size,
      eventTypes: Array.from(this.eventTypes),
      messageFormats: Object.keys(this.messageFormats).map(type => ({
        type,
        count: this.messageFormats[type].count,
        fields: Object.keys(this.messageFormats[type].fields)
      })),
      recentEventsCount: this.lastEvents.length
    };
  }
  
  /**
   * Obtém os eventos recentes
   * @param {Number} limit - Limite de eventos a retornar
   * @returns {Array} - Eventos recentes
   */
  getRecentEvents(limit = 10) {
    return this.lastEvents.slice(0, limit).map(event => ({
      timestamp: event.timestamp,
      eventType: event.eventType,
      ip: event.ip,
      bodyPreview: this.getBodyPreview(event.body)
    }));
  }
  
  /**
   * Obtém exemplos de formatos de mensagem
   * @returns {Object} - Exemplos de formatos
   */
  getMessageFormatExamples() {
    const examples = {};
    
    for (const [type, data] of Object.entries(this.messageFormats)) {
      examples[type] = {
        count: data.count,
        example: data.example,
        fields: data.fields
      };
    }
    
    return examples;
  }
}

// Exportar uma instância única
module.exports = new WebhookMonitor(); 