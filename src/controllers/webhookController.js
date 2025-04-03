/**
 * Controlador para lidar com webhooks da Evolution API
 */
const logger = require('../utils/logger');
const evolutionApi = require('../services/evolutionApi');
const Message = require('../models/Message');
const Client = require('../models/Client');

/**
 * Processa webhooks recebidos da Evolution API
 */
exports.handleWebhook = async (req, res) => {
  try {
    const { event, data } = req.body;
    
    logger.info(`Webhook recebido: ${event}`);
    logger.debug(`Dados do webhook: ${JSON.stringify(data)}`);
    
    // Responde imediatamente para não bloquear Evolution API
    res.status(200).json({ success: true });
    
    // Processa o evento de acordo com o tipo
    switch (event) {
      case 'connection.update':
        await handleConnectionUpdate(data);
        break;
      
      case 'messages.upsert':
        await handleNewMessage(data);
        break;
      
      case 'messages.update':
        await handleMessageStatusUpdate(data);
        break;
      
      case 'chats.set':
        await handleChatsSync(data);
        break;
      
      case 'contacts.update':
        await handleContactsUpdate(data);
        break;
      
      default:
        logger.info(`Evento não tratado: ${event}`);
    }
  } catch (error) {
    logger.error(`Erro ao processar webhook: ${error.message}`);
    logger.error(error.stack);
    
    // Responde com erro, mas não afeta a Evolution API
    if (!res.headersSent) {
      res.status(500).json({ 
        success: false, 
        message: 'Erro ao processar webhook'
      });
    }
  }
};

/**
 * Processa atualizações de status de conexão
 */
async function handleConnectionUpdate(data) {
  logger.info(`Status da conexão: ${data.connection}`);
  
  // Atualizar status no banco de dados ou realizar outras ações necessárias
  // Exemplo: notificar adminsitradores, tentar reconectar, etc.
}

/**
 * Processa novas mensagens recebidas
 */
async function handleNewMessage(data) {
  // Verifica se é mensagem recebida (não enviada por nós)
  if (data.key && !data.key.fromMe) {
    try {
      const sender = data.key.remoteJid;
      const message = data.message?.conversation || 
                     data.message?.extendedTextMessage?.text ||
                     'Mídia recebida';
      
      logger.info(`Nova mensagem de ${sender}: ${message}`);
      
      // Salva a mensagem no banco de dados
      const newMessage = new Message({
        sender,
        body: message,
        direction: 'received',
        status: 'received',
        timestamp: new Date()
      });
      
      await newMessage.save();
      
      // Verifica se o remetente existe na base de clientes
      const clientExists = await Client.exists({ phone: sender.split('@')[0] });
      
      if (!clientExists) {
        // Cria um novo cliente com dados básicos
        const newClient = new Client({
          phone: sender.split('@')[0],
          source: 'whatsapp',
          registrationDate: new Date()
        });
        
        await newClient.save();
        logger.info(`Novo cliente criado a partir de mensagem: ${sender}`);
      }
      
      // Aqui você pode implementar respostas automáticas
      // ou integrar com um sistema de chatbot
      
    } catch (error) {
      logger.error(`Erro ao processar nova mensagem: ${error.message}`);
    }
  }
}

/**
 * Processa atualizações de status de mensagens
 */
async function handleMessageStatusUpdate(data) {
  try {
    const { id, status } = data;
    
    // Atualiza o status da mensagem no banco de dados
    await Message.findOneAndUpdate(
      { 'evolutionApiMessageId': id },
      { $set: { status } }
    );
    
    logger.info(`Status da mensagem ${id} atualizado para: ${status}`);
  } catch (error) {
    logger.error(`Erro ao processar atualização de status: ${error.message}`);
  }
}

/**
 * Processa sincronização de chats
 */
async function handleChatsSync(data) {
  logger.info(`Sincronização de ${data.length} chats`);
  
  // Implementar lógica de sincronização se necessário
}

/**
 * Processa atualizações de contatos
 */
async function handleContactsUpdate(data) {
  logger.info(`Atualização de contatos recebida: ${data.length} contatos`);
  
  // Implementar sincronização de contatos se necessário
}
