/**
 * Controlador para lidar com webhooks da Evolution API
 */
const logger = require('../utils/logger');
const Message = require('../models/Message');
const Client = require('../models/Client');
const webhookMonitor = require('../utils/webhookMonitor');

/**
 * Processa webhooks recebidos da Evolution API
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Log do corpo completo do webhook recebido
    logger.info('Webhook recebido da Evolution API');
    
    // Registrar o evento no monitor de webhooks
    const eventType = webhookMonitor.logWebhookEvent(req, req.body);
    
    // Processar o webhook com base no tipo de evento
    if (eventType.startsWith('message_status_')) {
      await processMessageStatus(req.body);
    } else if (eventType === 'message_received') {
      await processIncomingMessage(req.body);
    }
    
    // Responder com sucesso
    res.status(200).json({
      success: true,
      message: 'Webhook processado com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao processar webhook: ${error.message}`);
    logger.error(error.stack);
    
    // Mesmo em caso de erro, respondemos com 200 para a Evolution API
    // não tentar reenviar o webhook (conforme documentação)
    res.status(200).json({
      success: false,
      message: `Erro ao processar webhook: ${error.message}`
    });
  }
};

/**
 * Processa atualizações de status de mensagem
 * @param {Object} data - Dados do webhook
 */
async function processMessageStatus(data) {
  try {
    // Extrair o ID da mensagem e o status
    const messageId = data.id;
    const status = data.status;
    
    logger.info(`Atualizando status da mensagem ${messageId} para ${status}`);
    
    // Atualiza o status da mensagem no banco de dados
    await Message.findOneAndUpdate(
      { waMessageId: messageId },
      { status: status }
    );
    
  } catch (error) {
    logger.error(`Erro ao atualizar status da mensagem: ${error.message}`);
  }
}

/**
 * Processa mensagens recebidas
 * @param {Object} data - Dados do webhook
 */
async function processIncomingMessage(data) {
  try {
    // Extrair informações da mensagem
    const remoteJid = data.key.remoteJid;
    const messageId = data.key.id;
    
    // Extrair o número de telefone do remoteJid (formato: 5511999999999@s.whatsapp.net)
    const phone = remoteJid.split('@')[0];
    
    logger.info(`Mensagem recebida de ${phone}, ID: ${messageId}`);
    
    // Verificar se o cliente existe
    let client = await Client.findOne({ phone });
    
    if (!client) {
      logger.info(`Cliente não encontrado para o telefone ${phone}, criando novo registro`);
      
      // Extrair o nome do contato, se disponível
      let name = 'Cliente';
      if (data.pushName) {
        name = data.pushName;
      }
      
      // Criar um novo cliente
      client = await Client.create({
        name,
        phone,
        source: 'whatsapp',
        status: 'active',
        tags: ['whatsapp-auto']
      });
      
      logger.info(`Novo cliente criado: ${client._id}`);
    }
    
    // Extrair o conteúdo da mensagem
    let messageContent = '';
    let messageType = 'unknown';
    
    if (data.message) {
      if (data.message.conversation) {
        messageContent = data.message.conversation;
        messageType = 'text';
      } else if (data.message.imageMessage) {
        messageContent = data.message.imageMessage.caption || 'Imagem recebida';
        messageType = 'image';
      } else if (data.message.videoMessage) {
        messageContent = data.message.videoMessage.caption || 'Vídeo recebido';
        messageType = 'video';
      } else if (data.message.audioMessage) {
        messageContent = 'Áudio recebido';
        messageType = 'audio';
      } else if (data.message.documentMessage) {
        messageContent = data.message.documentMessage.fileName || 'Documento recebido';
        messageType = 'document';
      } else if (data.message.stickerMessage) {
        messageContent = 'Sticker recebido';
        messageType = 'sticker';
      } else {
        messageContent = 'Mensagem de tipo desconhecido';
      }
    }
    
    // Registrar a mensagem recebida
    const message = await Message.create({
      client: client._id,
      direction: 'received',
      content: messageContent,
      type: messageType,
      waMessageId: messageId,
      status: 'received',
      metadata: {
        rawData: data
      }
    });
    
    logger.info(`Mensagem registrada: ${message._id}`);
    
    // Aqui você pode adicionar lógica para resposta automática
    // ou processamento adicional da mensagem
    
  } catch (error) {
    logger.error(`Erro ao processar mensagem recebida: ${error.message}`);
    logger.error(error.stack);
  }
}

/**
 * Obtém estatísticas de eventos de webhook
 */
exports.getWebhookStats = async (req, res) => {
  try {
    const stats = webhookMonitor.getStats();
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error(`Erro ao obter estatísticas de webhook: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao obter estatísticas: ${error.message}`
    });
  }
};

/**
 * Obtém eventos recentes de webhook
 */
exports.getRecentEvents = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const events = webhookMonitor.getRecentEvents(limit);
    
    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    logger.error(`Erro ao obter eventos recentes: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao obter eventos recentes: ${error.message}`
    });
  }
};

/**
 * Obtém exemplos de formatos de mensagem
 */
exports.getMessageFormats = async (req, res) => {
  try {
    const formats = webhookMonitor.getMessageFormatExamples();
    
    res.status(200).json({
      success: true,
      data: formats
    });
  } catch (error) {
    logger.error(`Erro ao obter formatos de mensagem: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao obter formatos de mensagem: ${error.message}`
    });
  }
};
