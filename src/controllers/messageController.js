/**
 * Controlador para gerenciamento de mensagens
 */
const Message = require('../models/Message');
const Client = require('../models/Client');
const evolutionApi = require('../services/evolutionApi');
const messageService = require('../services/messageService');
const validator = require('../utils/validator');
const logger = require('../utils/logger');

// Enviar mensagem individual
exports.sendMessage = async (req, res) => {
  try {
    // Validações básicas
    if (!req.body.clientId || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: 'ID do cliente e conteúdo da mensagem são obrigatórios'
      });
    }

    // Busca o cliente
    const client = await Client.findById(req.body.clientId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Cliente não encontrado'
      });
    }

    if (client.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível enviar mensagem para cliente inativo'
      });
    }

    // Sanitiza o conteúdo da mensagem
    const messageContent = validator.sanitizeText(req.body.content);

    // Envia a mensagem
    const message = await messageService.sendMessage(
      client,
      messageContent,
      req.body.mediaUrls || []
    );

    if (!message) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar mensagem'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Mensagem enviada com sucesso',
      data: message
    });

  } catch (error) {
    logger.error(`Erro ao enviar mensagem: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar mensagem: ${error.message}`
    });
  }
};

// Enviar mensagem para vários clientes
exports.sendBulkMessages = async (req, res) => {
  try {
    // Validações básicas
    if (!req.body.clientIds || !Array.isArray(req.body.clientIds) || !req.body.content) {
      return res.status(400).json({
        success: false,
        message: 'Lista de IDs de clientes e conteúdo da mensagem são obrigatórios'
      });
    }

    // Limita o número de destinatários
    if (req.body.clientIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Número máximo de destinatários excedido (máximo: 100)'
      });
    }

    // Busca os clientes
    const clients = await Client.find({
      _id: { $in: req.body.clientIds },
      status: 'active'
    });

    if (clients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum cliente ativo encontrado'
      });
    }

    // Sanitiza o conteúdo da mensagem
    const messageContent = validator.sanitizeText(req.body.content);
    const mediaUrls = req.body.mediaUrls || [];

    // Inicia o envio em background
    res.status(202).json({
      success: true,
      message: `Iniciando envio para ${clients.length} clientes`,
      data: {
        totalRecipients: clients.length
      }
    });

    // Envia as mensagens em background
    const sendPromises = clients.map(client => {
      return messageService.sendMessage(client, messageContent, mediaUrls);
    });

    // Processa os resultados
    Promise.allSettled(sendPromises)
      .then(results => {
        const sent = results.filter(r => r.status === 'fulfilled' && r.value).length;
        const failed = results.length - sent;
        
        logger.info(`Envio em massa concluído: ${sent} enviadas, ${failed} falhas`);
      })
      .catch(error => {
        logger.error(`Erro no envio em massa: ${error.message}`);
      });

  } catch (error) {
    logger.error(`Erro ao enviar mensagens em massa: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao enviar mensagens em massa: ${error.message}`
    });
  }
};

// Listar mensagens com paginação e filtros
exports.getMessages = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    // Filtros
    const filter = {};

    if (req.query.clientId) {
      filter.client = req.query.clientId;
    }

    if (req.query.promotionId) {
      filter.promotion = req.query.promotionId;
    }

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.type) {
      filter.messageType = req.query.type;
    }

    // Filtros de data
    if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    }

    if (req.query.endDate) {
      filter.createdAt = { 
        ...filter.createdAt,
        $lte: new Date(req.query.endDate) 
      };
    }

    // Contagem total para paginação
    const total = await Message.countDocuments(filter);

    // Consulta com paginação e ordenação
    const messages = await Message.find(filter)
      .populate('client', 'name phone')
      .populate('promotion', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Informações de paginação
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return res.status(200).json({
      success: true,
      count: messages.length,
      total,
      pagination: {
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      data: messages
    });

  } catch (error) {
    logger.error(`Erro ao listar mensagens: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao listar mensagens: ${error.message}`
    });
  }
};

// Obter uma mensagem específica
exports.getMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id)
      .populate('client', 'name phone')
      .populate('promotion', 'name');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    return res.status(200).json({
      success: true,
      data: message
    });

  } catch (error) {
    logger.error(`Erro ao buscar mensagem: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao buscar mensagem: ${error.message}`
    });
  }
};

// Atualizar status da mensagem
exports.updateMessageStatus = async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Mensagem não encontrada'
      });
    }

    if (!message.waId) {
      return res.status(400).json({
        success: false,
        message: 'Mensagem não possui ID do WhatsApp'
      });
    }

    // Atualiza o status
    const updatedMessage = await messageService.updateMessageStatus(message);

    return res.status(200).json({
      success: true,
      message: `Status atualizado: ${updatedMessage.status}`,
      data: updatedMessage
    });

  } catch (error) {
    logger.error(`Erro ao atualizar status: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao atualizar status: ${error.message}`
    });
  }
};

// Verificar status de conexão com a API
exports.checkConnection = async (req, res) => {
  try {
    const connected = await evolutionApi.checkConnection();

    return res.status(200).json({
      success: true,
      connected,
      instance: evolutionApi.instance
    });

  } catch (error) {
    logger.error(`Erro ao verificar conexão: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao verificar conexão: ${error.message}`
    });
  }
};

// Obter QR Code para conexão
exports.getQRCode = async (req, res) => {
  try {
    // Verifica se já está conectado
    const connected = await evolutionApi.checkConnection();

    if (connected) {
      return res.status(200).json({
        success: true,
        connected: true,
        message: 'Já está conectado à Evolution API'
      });
    }

    // Inicia a instância
    const qrInfo = await evolutionApi.startInstance();

    if (!qrInfo) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao gerar QR Code'
      });
    }

    return res.status(200).json({
      success: true,
      connected: false,
      qrcode: qrInfo.qrcode,
      base64: qrInfo.base64
    });

  } catch (error) {
    logger.error(`Erro ao gerar QR Code: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao gerar QR Code: ${error.message}`
    });
  }
};

// Desconectar WhatsApp
exports.disconnect = async (req, res) => {
  try {
    const disconnected = await evolutionApi.disconnect();

    if (!disconnected) {
      return res.status(500).json({
        success: false,
        message: 'Erro ao desconectar'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Desconectado com sucesso'
    });

  } catch (error) {
    logger.error(`Erro ao desconectar: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao desconectar: ${error.message}`
    });
  }
};

// Obter estatísticas de mensagens
exports.getStats = async (req, res) => {
  try {
    // Total de mensagens
    const totalMessages = await Message.countDocuments();
    
    // Mensagens por status
    const statusStats = await Message.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // Mensagens por tipo
    const typeStats = await Message.aggregate([
      { $group: { _id: '$messageType', count: { $sum: 1 } } }
    ]);
    
    // Mensagens nas últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const recentMessages = await Message.countDocuments({
      createdAt: { $gte: oneDayAgo }
    });
    
    // Taxa de entrega
    const deliveryRate = await Message.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          delivered: [
            { $match: { status: { $in: ['delivered', 'read'] } } },
            { $count: 'count' }
          ]
        }
      }
    ]);
    
    const totalCount = deliveryRate[0].total[0]?.count || 0;
    const deliveredCount = deliveryRate[0].delivered[0]?.count || 0;
    
    const rate = totalCount > 0 ? (deliveredCount / totalCount * 100).toFixed(2) : 0;
    
    return res.status(200).json({
      success: true,
      data: {
        totalMessages,
        statusBreakdown: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        typeBreakdown: typeStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        recentMessages,
        deliveryRate: rate
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
