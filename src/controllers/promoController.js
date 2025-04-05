/**
 * Controlador para gerenciamento de promoções
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Promotion = require('../models/Promotion');
const Client = require('../models/Client');
const Message = require('../models/Message');
const schedulerService = require('../services/schedulerService');
const messageService = require('../services/messageService');
const logger = require('../utils/logger');
const validator = require('../utils/validator');

// Criar uma nova promoção
exports.createPromotion = async (req, res) => {
  try {
    // Validações básicas
    if (!req.body.name || !req.body.description || !req.body.messageTemplate) {
      return res.status(400).json({
        success: false,
        message: 'Nome, descrição e template da mensagem são obrigatórios'
      });
    }

    // Validações de datas
    if (!req.body.schedule || !req.body.schedule.startDate) {
      return res.status(400).json({
        success: false,
        message: 'Data de início é obrigatória'
      });
    }

    // Verifica se a data de início é válida
    if (!validator.isValidDate(req.body.schedule.startDate)) {
      return res.status(400).json({
        success: false,
        message: 'Data de início inválida'
      });
    }

    // Verifica data de término se existir
    if (req.body.schedule.endDate && !validator.isValidDate(req.body.schedule.endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Data de término inválida'
      });
    }

    // Verifica expressão cron se for personalizada
    if (
      req.body.schedule.recurrence === 'custom' && 
      req.body.schedule.cronExpression && 
      !validator.isValidCron(req.body.schedule.cronExpression)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Expressão cron inválida'
      });
    }

    // Cria objeto da promoção
    const promotion = new Promotion({
      name: req.body.name,
      description: req.body.description,
      type: req.body.type || 'custom',
      messageTemplate: req.body.messageTemplate,
      mediaUrls: req.body.mediaUrls || [],
      schedule: {
        startDate: new Date(req.body.schedule.startDate),
        endDate: req.body.schedule.endDate ? new Date(req.body.schedule.endDate) : null,
        cronExpression: req.body.schedule.cronExpression,
        sendTime: req.body.schedule.sendTime,
        recurrence: req.body.schedule.recurrence || 'once'
      },
      targeting: {
        allClients: req.body.targeting ? req.body.targeting.allClients : true,
        includeTags: req.body.targeting && req.body.targeting.includeTags ? req.body.targeting.includeTags : [],
        excludeTags: req.body.targeting && req.body.targeting.excludeTags ? req.body.targeting.excludeTags : [],
        frequencyMin: req.body.targeting && req.body.targeting.frequencyMin,
        frequencyMax: req.body.targeting && req.body.targeting.frequencyMax,
        lastVisitDays: req.body.targeting && req.body.targeting.lastVisitDays
      },
      status: 'draft',
      createdBy: req.user ? req.user._id : null
    });

    // Salva a promoção
    await promotion.save();

    return res.status(201).json({
      success: true,
      message: 'Promoção criada com sucesso',
      data: promotion
    });

  } catch (error) {
    logger.error(`Erro ao criar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao criar promoção: ${error.message}`
    });
  }
};

// Atualizar uma promoção existente
exports.updatePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Verifica se a promoção já foi enviada ou está em andamento
    if (['active', 'completed'].includes(promotion.status)) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível editar uma promoção ativa ou concluída'
      });
    }

    // Atualiza campos básicos
    if (req.body.name) promotion.name = req.body.name;
    if (req.body.description) promotion.description = req.body.description;
    if (req.body.type) promotion.type = req.body.type;
    if (req.body.messageTemplate) promotion.messageTemplate = req.body.messageTemplate;
    if (req.body.mediaUrls) promotion.mediaUrls = req.body.mediaUrls;

    // Atualiza configurações de agendamento
    if (req.body.schedule) {
      if (req.body.schedule.startDate) {
        if (!validator.isValidDate(req.body.schedule.startDate)) {
          return res.status(400).json({
            success: false,
            message: 'Data de início inválida'
          });
        }
        promotion.schedule.startDate = new Date(req.body.schedule.startDate);
      }

      if (req.body.schedule.endDate) {
        if (!validator.isValidDate(req.body.schedule.endDate)) {
          return res.status(400).json({
            success: false,
            message: 'Data de término inválida'
          });
        }
        promotion.schedule.endDate = new Date(req.body.schedule.endDate);
      } else if (req.body.schedule.endDate === null) {
        promotion.schedule.endDate = null;
      }

      if (req.body.schedule.recurrence) {
        promotion.schedule.recurrence = req.body.schedule.recurrence;
      }

      if (req.body.schedule.sendTime) {
        promotion.schedule.sendTime = req.body.schedule.sendTime;
      }

      if (req.body.schedule.cronExpression) {
        if (!validator.isValidCron(req.body.schedule.cronExpression)) {
          return res.status(400).json({
            success: false,
            message: 'Expressão cron inválida'
          });
        }
        promotion.schedule.cronExpression = req.body.schedule.cronExpression;
      }
    }

    // Atualiza configurações de targeting
    if (req.body.targeting) {
      if (typeof req.body.targeting.allClients === 'boolean') {
        promotion.targeting.allClients = req.body.targeting.allClients;
      }

      if (Array.isArray(req.body.targeting.includeTags)) {
        promotion.targeting.includeTags = req.body.targeting.includeTags;
      }

      if (Array.isArray(req.body.targeting.excludeTags)) {
        promotion.targeting.excludeTags = req.body.targeting.excludeTags;
      }

      if (req.body.targeting.frequencyMin !== undefined) {
        promotion.targeting.frequencyMin = req.body.targeting.frequencyMin;
      }

      if (req.body.targeting.frequencyMax !== undefined) {
        promotion.targeting.frequencyMax = req.body.targeting.frequencyMax;
      }

      if (req.body.targeting.lastVisitDays !== undefined) {
        promotion.targeting.lastVisitDays = req.body.targeting.lastVisitDays;
      }
    }

    // Atualiza status
    if (req.body.status && ['draft', 'scheduled', 'paused', 'cancelled'].includes(req.body.status)) {
      promotion.status = req.body.status;
    }

    // Salva alterações
    await promotion.save();

    return res.status(200).json({
      success: true,
      message: 'Promoção atualizada com sucesso',
      data: promotion
    });

  } catch (error) {
    logger.error(`Erro ao atualizar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao atualizar promoção: ${error.message}`
    });
  }
};

// Obter todas as promoções
exports.getPromotions = async (req, res) => {
  try {
    console.log('=== INÍCIO: getPromotions ===');
    
    // Opções de paginação
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    
    // Opções de filtro
    const filter = {};
    
    // Filtro por status
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // Filtro por tipo
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // Filtro por busca
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { description: searchRegex }
      ];
    }
    
    console.log('Filtros aplicados:', filter);
    
    // Executar a consulta
    const promotions = await Promotion.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    // Contar total de registros
    const total = await Promotion.countDocuments(filter);
    
    console.log(`Encontradas ${promotions.length} promoções de um total de ${total}`);
    
    // Retornar os resultados
    res.status(200).json({
      success: true,
      count: promotions.length,
      total,
      page,
      pages: Math.ceil(total / limit),
      data: promotions
    });
    
    console.log('=== FIM: getPromotions ===');
  } catch (error) {
    console.error('=== ERRO: getPromotions ===');
    console.error('Mensagem de erro:', error.message);
    console.error('Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: `Erro ao buscar promoções: ${error.message}`
    });
  }
};

// Obter uma promoção específica
exports.getPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id)
      .populate('createdBy', 'name');

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: promotion
    });

  } catch (error) {
    logger.error(`Erro ao buscar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao buscar promoção: ${error.message}`
    });
  }
};

// Excluir uma promoção
exports.deletePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Verifica se a promoção já foi enviada ou está ativa
    if (['active', 'completed'].includes(promotion.status)) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir uma promoção ativa ou concluída'
      });
    }

    // Cancela agendamento se existir
    if (promotion.status === 'scheduled') {
      schedulerService.cancelScheduledPromotion(promotion._id);
    }

    // Remove a promoção
    await promotion.remove();

    return res.status(200).json({
      success: true,
      message: 'Promoção excluída com sucesso'
    });

  } catch (error) {
    logger.error(`Erro ao excluir promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao excluir promoção: ${error.message}`
    });
  }
};

// Fazer upload de mídia para a promoção
exports.uploadMedia = async (req, res) => {
  try {
    if (!req.files || !req.files.media) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    const mediaFile = req.files.media;
    const fileExtension = path.extname(mediaFile.name).toLowerCase();

    // Verifica tipo de arquivo
    if (!validator.isValidFileType(mediaFile.name, 'image') && 
        !validator.isValidFileType(mediaFile.name, 'document')) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de arquivo não permitido'
      });
    }

    // Verifica tamanho do arquivo
    if (mediaFile.size > config.upload.maxFileSize) {
      return res.status(400).json({
        success: false,
        message: `Tamanho máximo permitido: ${config.upload.maxFileSize / (1024 * 1024)}MB`
      });
    }

    // Gera nome único
    const uniqueFilename = `${uuidv4()}${fileExtension}`;
    const uploadPath = path.join(__dirname, '../../uploads/promotions', uniqueFilename);

    // Move o arquivo
    await mediaFile.mv(uploadPath);

    // Caminho relativo para o frontend
    const mediaUrl = `/uploads/promotions/${uniqueFilename}`;

    return res.status(200).json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        filename: uniqueFilename,
        originalName: mediaFile.name,
        size: mediaFile.size,
        url: mediaUrl
      }
    });

  } catch (error) {
    logger.error(`Erro ao fazer upload de mídia: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao fazer upload de mídia: ${error.message}`
    });
  }
};

// Agendar uma promoção para envio
exports.schedulePromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Verifica se a promoção já está agendada ou ativa
    if (['scheduled', 'active', 'completed'].includes(promotion.status)) {
      return res.status(400).json({
        success: false,
        message: `Promoção já está ${promotion.status}`
      });
    }

    // Atualiza status
    promotion.status = 'scheduled';
    await promotion.save();

    // Agenda a promoção
    const scheduled = await schedulerService.schedulePromotion(promotion);

    if (!scheduled) {
      promotion.status = 'draft';
      await promotion.save();
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao agendar promoção'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Promoção agendada com sucesso',
      data: promotion
    });

  } catch (error) {
    logger.error(`Erro ao agendar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao agendar promoção: ${error.message}`
    });
  }
};

// Cancelar uma promoção agendada
exports.cancelPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Verifica se a promoção está agendada ou ativa
    if (!['scheduled', 'active'].includes(promotion.status)) {
      return res.status(400).json({
        success: false,
        message: 'Promoção não está agendada ou ativa'
      });
    }

    // Cancela o agendamento
    schedulerService.cancelScheduledPromotion(promotion._id);

    // Atualiza status
    promotion.status = 'cancelled';
    await promotion.save();

    return res.status(200).json({
      success: true,
      message: 'Promoção cancelada com sucesso'
    });

  } catch (error) {
    logger.error(`Erro ao cancelar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao cancelar promoção: ${error.message}`
    });
  }
};

// Enviar promoção imediatamente
exports.sendPromotion = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Verifica se a promoção está em estado válido
    if (!['draft', 'scheduled', 'paused'].includes(promotion.status)) {
      return res.status(400).json({
        success: false,
        message: 'Promoção não pode ser enviada no status atual'
      });
    }

    // Constrói a query para selecionar os clientes alvo
    let clientQuery = { status: 'active' };

    // Adiciona filtros de segmentação se não for para todos os clientes
    if (!promotion.targeting.allClients) {
      // Filtros de tags
      if (promotion.targeting.includeTags && promotion.targeting.includeTags.length > 0) {
        clientQuery.tags = { $in: promotion.targeting.includeTags };
      }
      
      if (promotion.targeting.excludeTags && promotion.targeting.excludeTags.length > 0) {
        clientQuery.tags = { ...clientQuery.tags, $nin: promotion.targeting.excludeTags };
      }
      
      // Filtros de frequência
      if (typeof promotion.targeting.frequencyMin === 'number') {
        clientQuery.frequencyScore = { $gte: promotion.targeting.frequencyMin };
      }
      
      if (typeof promotion.targeting.frequencyMax === 'number') {
        clientQuery.frequencyScore = { 
          ...clientQuery.frequencyScore,
          $lte: promotion.targeting.frequencyMax 
        };
      }
      
      // Filtro de última visita
      if (typeof promotion.targeting.lastVisitDays === 'number') {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - promotion.targeting.lastVisitDays);
        
        clientQuery.lastVisit = { $gte: cutoffDate };
      }
    }

    // Busca os clientes que correspondem aos critérios
    const clients = await Client.find(clientQuery);

    if (clients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum cliente corresponde aos critérios selecionados'
      });
    }

    // Inicia o envio em background
    res.status(202).json({
      success: true,
      message: `Iniciando envio para ${clients.length} clientes`,
      data: {
        promotionId: promotion._id,
        totalRecipients: clients.length
      }
    });

    // Atualiza status da promoção
    promotion.status = 'active';
    promotion.metrics.totalRecipients = clients.length;
    await promotion.save();

    // Envia em background
    messageService.sendBulkPromotion(promotion, clients)
      .then(report => {
        // Atualiza status após envio
        promotion.status = 'completed';
        promotion.metrics.messagesSent = report.sent;
        return promotion.save();
      })
      .catch(error => {
        logger.error(`Erro no envio em massa: ${error.message}`);
      });

  } catch (error) {
    logger.error(`Erro ao enviar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar promoção: ${error.message}`
    });
  }
};

// Obter relatório de métricas de uma promoção
exports.getPromotionMetrics = async (req, res) => {
  try {
    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Busca mensagens relacionadas à promoção
    const messagesStats = await Message.aggregate([
      { $match: { promotion: promotion._id } },
      { $group: { 
        _id: '$status',
        count: { $sum: 1 }
      }}
    ]);

    // Formata os resultados
    const stats = {
      totalRecipients: promotion.metrics.totalRecipients,
      messagesSent: promotion.metrics.messagesSent,
      messagesDelivered: promotion.metrics.messagesDelivered,
      messagesRead: promotion.metrics.messagesRead,
      clicksCount: promotion.metrics.clicksCount,
      responseCount: promotion.metrics.responseCount,
      byStatus: messagesStats.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {})
    };

    // Calcula taxas
    stats.deliveryRate = stats.totalRecipients > 0 ? 
      (stats.messagesDelivered / stats.totalRecipients * 100).toFixed(2) : 0;
    
    stats.readRate = stats.messagesDelivered > 0 ? 
      (stats.messagesRead / stats.messagesDelivered * 100).toFixed(2) : 0;
    
    stats.clickRate = stats.messagesRead > 0 ? 
      (stats.clicksCount / stats.messagesRead * 100).toFixed(2) : 0;
    
    stats.responseRate = stats.messagesRead > 0 ? 
      (stats.responseCount / stats.messagesRead * 100).toFixed(2) : 0;

    return res.status(200).json({
      success: true,
      data: stats
    });

  } catch (error) {
    logger.error(`Erro ao obter métricas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao obter métricas: ${error.message}`
    });
  }
};

// Testar envio de promoção para um único número
exports.testPromotion = async (req, res) => {
  try {
    if (!req.body.phone || !validator.isValidPhone(req.body.phone)) {
      return res.status(400).json({
        success: false,
        message: 'Número de telefone inválido'
      });
    }

    const promotion = await Promotion.findById(req.params.id);

    if (!promotion) {
      return res.status(404).json({
        success: false,
        message: 'Promoção não encontrada'
      });
    }

    // Formata o telefone
    const formattedPhone = validator.formatPhone(req.body.phone);

    // Busca ou cria cliente para teste
    let client = await Client.findOne({ phone: formattedPhone });

    if (!client) {
      client = new Client({
        name: req.body.name || 'Cliente Teste',
        phone: formattedPhone,
        tags: ['teste'],
        status: 'active',
        source: 'manual'
      });
      await client.save();
    }

    // Formata a mensagem
    const messageContent = messageService.formatMessage(
      promotion.messageTemplate,
      client,
      promotion
    );

    // Envia a mensagem de teste
    const message = await messageService.sendMessage(
      client,
      messageContent,
      promotion.mediaUrls,
      promotion
    );

    if (!message) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem de teste'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mensagem de teste enviada com sucesso',
      data: message
    });

  } catch (error) {
    logger.error(`Erro ao testar promoção: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao testar promoção: ${error.message}`
    });
  }
};

// Obter estatísticas gerais de promoções
exports.getStats = async (req, res) => {
  try {
    // Total de promoções
    const totalPromotions = await Promotion.countDocuments();
    
    // Promoções por status
    const statusStats = await Promotion.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Promoções por tipo
    const typeStats = await Promotion.aggregate([
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);
    
    // Promoções criadas nos últimos 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPromotions = await Promotion.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    // Total de mensagens enviadas
    const messageStats = await Message.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Promoções com melhor taxa de leitura
    const topPromotions = await Promotion.find({
      'metrics.messagesDelivered': { $gt: 0 }
    })
    .sort({ 'metrics.messagesRead': -1 })
    .limit(5)
    .select('name metrics');
    
    return res.status(200).json({
      success: true,
      data: {
        totalPromotions,
        statusBreakdown: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        typeBreakdown: typeStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentPromotions,
        messageStats: messageStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        topPromotions: topPromotions.map(p => ({
          id: p._id,
          name: p.name,
          sent: p.metrics.messagesSent,
          delivered: p.metrics.messagesDelivered,
          read: p.metrics.messagesRead,
          readRate: p.metrics.messagesDelivered > 0 ? 
            (p.metrics.messagesRead / p.metrics.messagesDelivered * 100).toFixed(2) : 0
        }))
      }
    });
    
  } catch (error) {
    logger.error(`Erro ao obter estatísticas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao obter estatísticas: ${error.message}`
    });
  }
};

// Obter promoções recentes
exports.getRecentPromotions = async (req, res) => {
  try {
    // Define o limite de resultados (padrão: 5)
    const limit = parseInt(req.query.limit) || 5;
    
    // Busca promoções recentes (enviadas nos últimos 30 dias)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentPromotions = await Promotion.find({
      status: { $in: ['completed', 'active'] },
      'schedule.startDate': { $gte: thirtyDaysAgo }
    })
    .sort({ 'schedule.startDate': -1 })
    .limit(limit)
    .select('name description type status schedule metrics');
    
    // Formata os resultados para a resposta
    const formattedPromotions = recentPromotions.map(promo => ({
      id: promo._id,
      name: promo.name,
      description: promo.description,
      type: promo.type,
      status: promo.status,
      sentDate: promo.schedule.startDate,
      metrics: {
        sent: promo.metrics?.messagesSent || 0,
        delivered: promo.metrics?.messagesDelivered || 0,
        read: promo.metrics?.messagesRead || 0,
        readRate: promo.metrics?.messagesDelivered > 0 ? 
          (promo.metrics.messagesRead / promo.metrics.messagesDelivered * 100).toFixed(2) : 0
      }
    }));
    
    return res.status(200).json({
      success: true,
      count: formattedPromotions.length,
      data: formattedPromotions
    });
    
  } catch (error) {
    logger.error(`Erro ao obter promoções recentes: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao obter promoções recentes: ${error.message}`
    });
  }
};

// Obter promoções agendadas para o futuro
exports.getUpcomingPromotions = async (req, res) => {
  try {
    // Define o limite de resultados (padrão: 5)
    const limit = parseInt(req.query.limit) || 5;
    
    // Data atual
    const now = new Date();
    
    // Busca promoções agendadas para o futuro
    const upcomingPromotions = await Promotion.find({
      status: { $in: ['scheduled', 'draft'] },
      'schedule.startDate': { $gte: now }
    })
    .sort({ 'schedule.startDate': 1 })
    .limit(limit)
    .select('name description type status schedule targeting');
    
    // Formata os resultados para a resposta
    const formattedPromotions = upcomingPromotions.map(promo => ({
      id: promo._id,
      name: promo.name,
      description: promo.description,
      type: promo.type,
      status: promo.status,
      scheduledDate: promo.schedule.startDate,
      recurrence: promo.schedule.recurrence,
      targeting: {
        allClients: promo.targeting.allClients,
        includeTags: promo.targeting.includeTags,
        excludeTags: promo.targeting.excludeTags
      }
    }));
    
    return res.status(200).json({
      success: true,
      count: formattedPromotions.length,
      data: formattedPromotions
    });
    
  } catch (error) {
    logger.error(`Erro ao obter promoções agendadas: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao obter promoções agendadas: ${error.message}`
    });
  }
};
