/**
 * Controlador para lidar com webhooks da Evolution API
 */
const logger = require('../utils/logger');
const Message = require('../models/Message');
const Client = require('../models/Client');
const evolutionApi = require('../services/evolutionApi'); // Importando o serviço

/**
 * Processa webhooks recebidos da Evolution API
 */
exports.handleWebhook = async (req, res) => {
  try {
    // Log do corpo completo do webhook recebido
    logger.info(`Webhook recebido da Evolution API`);
    logger.debug(`Dados do webhook: ${JSON.stringify(req.body)}`);
    
    // Responde imediatamente com sucesso
    res.status(200).json({ success: true, message: 'Webhook recebido com sucesso' });
    
    // Processa os dados do webhook após responder
    const webhookData = req.body;
    
    // Processa o evento conforme o caso
    if (webhookData.event === 'messages.upsert' && webhookData.data.messages) {
      // Processa as mensagens recebidas
      for (const message of webhookData.data.messages) {
        if (!message.key.fromMe) {
          await processIncomingMessage(message);
        }
      }
    } 
    else if (webhookData.event === 'messages.update') {
      // Atualiza o status das mensagens
      for (const update of webhookData.data) {
        await updateMessageStatus(update);
      }
    }
    else if (webhookData.event === 'connection.update') {
      // Registra mudanças no status da conexão
      logger.info(`Status da conexão WhatsApp: ${webhookData.data.connection}`);
    }
    
  } catch (error) {
    logger.error(`Erro ao processar webhook: ${error.message}`);
    logger.error(error.stack);
    
    // Se ainda não enviou a resposta, envia um erro
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Erro ao processar webhook' });
    }
  }
};

/**
 * Processa uma mensagem recebida
 */
async function processIncomingMessage(message) {
  try {
    // Extrai informações básicas da mensagem
    const sender = message.key.remoteJid;
    let messageContent = '';
    
    // Extrai o conteúdo da mensagem conforme o tipo
    if (message.message?.conversation) {
      messageContent = message.message.conversation;
    } 
    else if (message.message?.extendedTextMessage?.text) {
      messageContent = message.message.extendedTextMessage.text;
    } 
    else if (message.message?.imageMessage) {
      messageContent = message.message.imageMessage.caption || '[Imagem]';
    }
    else if (message.message?.videoMessage) {
      messageContent = message.message.videoMessage.caption || '[Vídeo]';
    }
    else if (message.message?.audioMessage) {
      messageContent = '[Áudio]';
    }
    else if (message.message?.documentMessage) {
      messageContent = '[Documento]';
    }
    else {
      messageContent = '[Mensagem não identificada]';
    }
    
    logger.info(`Mensagem recebida de ${sender}: ${messageContent}`);
    
    // Salva a mensagem no banco de dados
    const newMessage = new Message({
      sender,
      body: messageContent,
      direction: 'received',
      status: 'received',
      timestamp: new Date(),
      rawData: message
    });
    
    await newMessage.save();
    logger.info(`Mensagem salva no banco de dados: ${newMessage._id}`);
    
    // Cria um cliente se ainda não existir
    const phone = sender.split('@')[0];
    const clientExists = await Client.findOne({ phone });
    
    if (!clientExists) {
      const newClient = new Client({
        phone,
        name: phone, // Nome provisório
        source: 'whatsapp',
        registrationDate: new Date()
      });
      
      await newClient.save();
      logger.info(`Novo cliente criado: ${phone}`);
    }
    
    // Não respondemos automaticamente - apenas registramos as mensagens
    
  } catch (error) {
    logger.error(`Erro ao processar mensagem: ${error.message}`);
  }
}

/**
 * Atualiza o status de uma mensagem
 */
async function updateMessageStatus(messageUpdate) {
  try {
    // Extrai o ID da mensagem e o novo status
    const messageId = messageUpdate.key.id;
    const status = messageUpdate.update.status || 'unknown';
    
    logger.info(`Atualizando status da mensagem ${messageId} para ${status}`);
    
    // Atualiza o status da mensagem no banco de dados
    await Message.findOneAndUpdate(
      { evolutionApiMessageId: messageId },
      { status: status }
    );
    
  } catch (error) {
    logger.error(`Erro ao atualizar status da mensagem: ${error.message}`);
  }
}
