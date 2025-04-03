/**
 * Serviço para gerenciamento e envio de mensagens
 */
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const config = require('../config/config');
const logger = require('../utils/logger');
const evolutionApi = require('./evolutionApi');
const Message = require('../models/Message');
const Client = require('../models/Client');
const Promotion = require('../models/Promotion');

class MessageService {
  constructor() {
    this.rateLimiter = {
      messagesPerDay: config.messaging.dailyLimit,
      messagesPerBatch: config.messaging.batchSize,
      delayBetweenBatches: config.messaging.delayBetweenBatches,
    };
  }
  
  /**
   * Formata uma mensagem substituindo placeholders por valores
   * @param {string} template - Template da mensagem com placeholders
   * @param {object} client - Objeto do cliente
   * @param {object} promotion - Objeto da promoção
   * @returns {string} - Mensagem formatada
   */
  formatMessage(template, client, promotion) {
    if (!template) return '';
    
    let formattedMessage = template;
    
    // Substitui variáveis do cliente
    if (client) {
      const clientName = client.name ? client.name.split(' ')[0] : 'cliente';
      formattedMessage = formattedMessage.replace(/{{nome}}/gi, clientName);
      formattedMessage = formattedMessage.replace(/{{nome_completo}}/gi, client.name || 'cliente');
      
      // Formata data de aniversário se existir
      if (client.birthday) {
        const birthday = new Date(client.birthday);
        const formattedBirthday = birthday.toLocaleDateString('pt-BR');
        formattedMessage = formattedMessage.replace(/{{aniversario}}/gi, formattedBirthday);
      }
      
      // Substitui outros campos personalizados
      Object.keys(client.toObject()).forEach(key => {
        formattedMessage = formattedMessage.replace(
          new RegExp(`{{${key}}}`, 'gi'),
          client[key] || ''
        );
      });
    }
    
    // Substitui variáveis da promoção
    if (promotion) {
      formattedMessage = formattedMessage.replace(/{{promocao}}/gi, promotion.name || '');
      formattedMessage = formattedMessage.replace(/{{descricao}}/gi, promotion.description || '');
      
      // Formata datas da promoção
      if (promotion.schedule && promotion.schedule.startDate) {
        const startDate = new Date(promotion.schedule.startDate);
        const formattedStartDate = startDate.toLocaleDateString('pt-BR');
        formattedMessage = formattedMessage.replace(/{{data_inicio}}/gi, formattedStartDate);
      }
      
      if (promotion.schedule && promotion.schedule.endDate) {
        const endDate = new Date(promotion.schedule.endDate);
        const formattedEndDate = endDate.toLocaleDateString('pt-BR');
        formattedMessage = formattedMessage.replace(/{{data_fim}}/gi, formattedEndDate);
      }
    }
    
    // Substitui data atual
    const today = new Date();
    formattedMessage = formattedMessage.replace(
      /{{data_atual}}/gi,
      today.toLocaleDateString('pt-BR')
    );
    
    // Remove placeholders não substituídos
    formattedMessage = formattedMessage.replace(/{{.*?}}/gi, '');
    
    return formattedMessage;
  }
  
  /**
   * Envia uma mensagem individual para um cliente
   * @param {object} client - Cliente destinatário
   * @param {string} messageContent - Conteúdo da mensagem
   * @param {Array} mediaUrls - Array de URLs de mídia (opcional)
   * @param {object} promotion - Objeto da promoção (opcional)
   * @returns {Promise<object>} - Mensagem enviada
   */
  async sendMessage(client, messageContent, mediaUrls = [], promotion = null) {
    try {
      // Verifica se o cliente está ativo
      if (client.status !== 'active') {
        logger.warn(`Cliente ${client._id} não está ativo, pulando envio`);
        return null;
      }
      
      // Cria registro da mensagem
      const messageType = mediaUrls.length > 0 ? (mediaUrls.length === 1 ? 'image' : 'mixed') : 'text';
      
      const message = new Message({
        client: client._id,
        promotion: promotion ? promotion._id : null,
        content: messageContent,
        mediaUrls: mediaUrls,
        messageType: messageType,
        status: 'queued',
        scheduledAt: new Date()
      });
      
      await message.save();
      
      // Envia a mensagem via Evolution API
      let apiResponse;
      
      // Determina o tipo de envio com base no conteúdo
      if (mediaUrls.length === 0) {
        // Mensagem de texto simples
        apiResponse = await evolutionApi.sendTextMessage(
          client.phone,
          messageContent
        );
      } else if (mediaUrls.length === 1) {
        // Mensagem com uma única mídia
        const mediaUrl = mediaUrls[0];
        const mediaType = this.getMediaType(mediaUrl);
        
        apiResponse = await evolutionApi.sendMediaMessage(
          client.phone,
          mediaUrl,
          messageContent,
          mediaType
        );
      } else {
        // Mensagem com múltiplas mídias (envia separadamente)
        // Primeiro envia o texto
        apiResponse = await evolutionApi.sendTextMessage(
          client.phone,
          messageContent
        );
        
        // Depois envia cada mídia
        for (const mediaUrl of mediaUrls) {
          const mediaType = this.getMediaType(mediaUrl);
          
          await evolutionApi.sendMediaMessage(
            client.phone,
            mediaUrl,
            '', // Sem legenda adicional
            mediaType
          );
        }
      }
      
      // Atualiza o status da mensagem com base na resposta
      if (apiResponse && apiResponse.success) {
        message.status = 'sent';
        message.waId = apiResponse.waId;
        message.deliveryInfo = {
          sentAt: new Date()
        };
        message.sentAt = new Date();
        
        // Atualiza as métricas da promoção
        if (promotion) {
          await Promotion.findByIdAndUpdate(promotion._id, {
            $inc: { 'metrics.messagesSent': 1 }
          });
        }
      } else {
        message.status = 'failed';
        message.deliveryInfo = {
          error: apiResponse ? apiResponse.error : 'Falha ao enviar mensagem'
        };
      }
      
      await message.save();
      return message;
    } catch (error) {
      logger.error(`Erro ao enviar mensagem: ${error.message}`);
      
      // Registra a falha
      if (message) {
        message.status = 'failed';
        message.deliveryInfo = {
          error: error.message
        };
        await message.save();
      }
      
      return null;
    }
  }
  
  /**
   * Envia uma promoção em massa para vários clientes
   * @param {object} promotion - Promoção a ser enviada
   * @param {Array} clients - Array de clientes destinatários
   * @returns {Promise<object>} - Relatório de envio
   */
  async sendBulkPromotion(promotion, clients) {
    const report = {
      total: clients.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      startTime: new Date(),
      endTime: null
    };
    
    try {
      logger.info(`Iniciando envio em massa para ${clients.length} clientes`);
      
      // Divide os clientes em lotes para evitar sobrecarga
      const batches = [];
      for (let i = 0; i < clients.length; i += this.rateLimiter.messagesPerBatch) {
        batches.push(clients.slice(i, i + this.rateLimiter.messagesPerBatch));
      }
      
      logger.info(`Dividido em ${batches.length} lotes de no máximo ${this.rateLimiter.messagesPerBatch} mensagens`);
      
      // Processa cada lote
      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        logger.info(`Processando lote ${i+1}/${batches.length} com ${batch.length} destinatários`);
        
        // Envia mensagens do lote em paralelo (com limite)
        const sendPromises = batch.map(client => {
          // Formata a mensagem para o cliente específico
          const messageContent = this.formatMessage(
            promotion.messageTemplate,
            client,
            promotion
          );
          
          return this.sendMessage(client, messageContent, promotion.mediaUrls, promotion)
            .then(message => {
              if (message) {
                if (message.status === 'sent') {
                  report.sent++;
                } else {
                  report.failed++;
                }
              } else {
                report.skipped++;
              }
            })
            .catch(error => {
              logger.error(`Erro ao enviar para cliente ${client._id}: ${error.message}`);
              report.failed++;
            });
        });
        
        // Aguarda o lote atual terminar
        await Promise.all(sendPromises);
        
        // Pausa entre lotes para evitar bloqueios
        if (i < batches.length - 1) {
          logger.info(`Aguardando ${this.rateLimiter.delayBetweenBatches}ms antes do próximo lote`);
          await new Promise(resolve => setTimeout(resolve, this.rateLimiter.delayBetweenBatches));
        }
      }
      
      // Atualiza métricas da promoção
      await Promotion.findByIdAndUpdate(promotion._id, {
        $set: {
          'metrics.messagesSent': report.sent
        }
      });
      
      report.endTime = new Date();
      logger.info(`Envio em massa concluído: ${report.sent} enviadas, ${report.failed} falhas, ${report.skipped} ignoradas`);
      
      return report;
    } catch (error) {
      report.endTime = new Date();
      logger.error(`Erro durante envio em massa: ${error.message}`);
      return report;
    }
  }
  
  /**
   * Atualiza o status de uma mensagem
   * @param {object} message - Mensagem a ser atualizada
   * @returns {Promise<object>} - Mensagem atualizada
   */
  async updateMessageStatus(message) {
    try {
      if (!message.waId) {
        logger.warn(`Mensagem ${message._id} não possui ID do WhatsApp, pulando atualização de status`);
        return message;
      }
      
      // Consulta status atual na Evolution API
      const currentStatus = await evolutionApi.getMessageStatus(message.waId);
      
      if (currentStatus === 'error' || currentStatus === 'unknown') {
        logger.warn(`Não foi possível obter status atual para mensagem ${message._id}`);
        return message;
      }
      
      // Mapeia o status retornado pela API para o modelo de dados
      let newStatus;
      switch (currentStatus) {
        case 'sent':
          newStatus = 'sent';
          break;
        case 'delivered':
          newStatus = 'delivered';
          if (!message.deliveryInfo.deliveredAt) {
            message.deliveryInfo.deliveredAt = new Date();
          }
          break;
        case 'read':
          newStatus = 'read';
          if (!message.deliveryInfo.readAt) {
            message.deliveryInfo.readAt = new Date();
          }
          break;
        case 'failed':
          newStatus = 'failed';
          message.deliveryInfo.error = 'Falha reportada pela API';
          break;
        default:
          newStatus = message.status;
      }
      
      // Atualiza apenas se o status for diferente
      if (newStatus !== message.status) {
        message.status = newStatus;
        await message.save();
        
        // Atualiza métricas da promoção se necessário
        if (message.promotion) {
          const metricsUpdate = {};
          
          if (newStatus === 'delivered') {
            metricsUpdate['metrics.messagesDelivered'] = 1;
          } else if (newStatus === 'read') {
            metricsUpdate['metrics.messagesRead'] = 1;
          }
          
          if (Object.keys(metricsUpdate).length > 0) {
            await Promotion.findByIdAndUpdate(message.promotion, {
              $inc: metricsUpdate
            });
          }
        }
        
        logger.info(`Status da mensagem ${message._id} atualizado para ${newStatus}`);
      }
      
      return message;
    } catch (error) {
      logger.error(`Erro ao atualizar status da mensagem ${message._id}: ${error.message}`);
      return message;
    }
  }
  
  /**
   * Determina o tipo de mídia com base na URL ou caminho do arquivo
   * @param {string} mediaUrl - URL ou caminho do arquivo
   * @returns {string} - Tipo de mídia (image, document, video, audio)
   */
  getMediaType(mediaUrl) {
    if (!mediaUrl) return 'document';
    
    const extension = path.extname(mediaUrl).toLowerCase();
    
    // Imagens
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(extension)) {
      return 'image';
    }
    
    // Vídeos
    if (['.mp4', '.mov', '.avi', '.webm'].includes(extension)) {
      return 'video';
    }
    
    // Áudios
    if (['.mp3', '.ogg', '.wav', '.opus'].includes(extension)) {
      return 'audio';
    }
    
    // Documentos (padrão para outros tipos)
    return 'document';
  }
  
  /**
   * Agenda mensagens em lote para envio futuro
   * @param {object} promotion - Promoção associada
   * @param {Array} clients - Lista de clientes destinatários
   * @param {Date} scheduledDate - Data de envio programada
   * @returns {Promise<number>} - Número de mensagens agendadas
   */
  async scheduleBulkMessages(promotion, clients, scheduledDate) {
    try {
      let scheduledCount = 0;
      
      for (const client of clients) {
        const messageContent = this.formatMessage(
          promotion.messageTemplate,
          client,
          promotion
        );
        
        // Cria registro de mensagem com status 'queued'
        const message = new Message({
          client: client._id,
          promotion: promotion._id,
          content: messageContent,
          mediaUrls: promotion.mediaUrls || [],
          messageType: promotion.mediaUrls && promotion.mediaUrls.length > 0 ? 
            (promotion.mediaUrls.length === 1 ? 'image' : 'mixed') : 'text',
          status: 'queued',
          scheduledAt: scheduledDate
        });
        
        await message.save();
        scheduledCount++;
      }
      
      logger.info(`${scheduledCount} mensagens agendadas para ${scheduledDate.toISOString()}`);
      return scheduledCount;
    } catch (error) {
      logger.error(`Erro ao agendar mensagens em lote: ${error.message}`);
      return 0;
    }
  }
  
  /**
   * Processa mensagens agendadas que estão prontas para envio
   * @returns {Promise<number>} - Número de mensagens processadas
   */
  async processScheduledMessages() {
    try {
      const now = new Date();
      
      // Busca mensagens agendadas que estão prontas para envio
      const scheduledMessages = await Message.find({
        status: 'queued',
        scheduledAt: { $lte: now }
      }).populate('client').limit(this.rateLimiter.messagesPerBatch);
      
      if (scheduledMessages.length === 0) {
        return 0;
      }
      
      logger.info(`Processando ${scheduledMessages.length} mensagens agendadas`);
      
      let processedCount = 0;
      
      for (const message of scheduledMessages) {
        // Pula clientes inativos
        if (message.client.status !== 'active') {
          message.status = 'failed';
          message.deliveryInfo = {
            error: 'Cliente inativo'
          };
          await message.save();
          continue;
        }
        
        // Envia a mensagem
        let apiResponse;
        
        if (message.mediaUrls.length === 0) {
          // Mensagem de texto simples
          apiResponse = await evolutionApi.sendTextMessage(
            message.client.phone,
            message.content
          );
        } else if (message.mediaUrls.length === 1) {
          // Mensagem com uma única mídia
          const mediaUrl = message.mediaUrls[0];
          const mediaType = this.getMediaType(mediaUrl);
          
          apiResponse = await evolutionApi.sendMediaMessage(
            message.client.phone,
            mediaUrl,
            message.content,
            mediaType
          );
        } else {
          // Mensagem com múltiplas mídias (envia separadamente)
          apiResponse = await evolutionApi.sendTextMessage(
            message.client.phone,
            message.content
          );
          
          // Depois envia cada mídia
          for (const mediaUrl of message.mediaUrls) {
            const mediaType = this.getMediaType(mediaUrl);
            
            await evolutionApi.sendMediaMessage(
              message.client.phone,
              mediaUrl,
              '',
              mediaType
            );
          }
        }
        
        // Atualiza o status da mensagem
        if (apiResponse && apiResponse.success) {
          message.status = 'sent';
          message.waId = apiResponse.waId;
          message.deliveryInfo = {
            sentAt: new Date()
          };
          message.sentAt = new Date();
          
          // Atualiza as métricas da promoção
          if (message.promotion) {
            await Promotion.findByIdAndUpdate(message.promotion, {
              $inc: { 'metrics.messagesSent': 1 }
            });
          }
          
          processedCount++;
        } else {
          message.status = 'failed';
          message.deliveryInfo = {
            error: apiResponse ? apiResponse.error : 'Falha ao enviar mensagem'
          };
        }
        
        await message.save();
      }
      
      logger.info(`${processedCount} mensagens agendadas processadas com sucesso`);
      return processedCount;
    } catch (error) {
      logger.error(`Erro ao processar mensagens agendadas: ${error.message}`);
      return 0;
    }
  }
}

module.exports = new MessageService();
