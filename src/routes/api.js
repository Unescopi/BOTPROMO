/**
 * Rotas principais da API
 */
const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const messageService = require('../services/messageService');
const Message = require('../models/Message');
const Client = require('../models/Client');
const Promotion = require('../models/Promotion');
const mongoose = require('mongoose');

// Rota de status
router.get('/status', (req, res) => {
  try {
    // Verifica a conexão com MongoDB
    const dbStatus = mongoose.connection.readyState;
    let dbStatusText;
    
    switch(dbStatus) {
      case 0: dbStatusText = 'Desconectado'; break;
      case 1: dbStatusText = 'Conectado'; break;
      case 2: dbStatusText = 'Conectando'; break;
      case 3: dbStatusText = 'Desconectando'; break;
      default: dbStatusText = 'Desconhecido';
    }
    
    // Coleta estatísticas básicas
    const statusData = {
      success: true,
      message: 'API em funcionamento',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      server: {
        platform: process.platform,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage()
      },
      database: {
        status: dbStatus,
        statusText: dbStatusText,
        connected: dbStatus === 1
      },
      request: {
        ip: req.ip,
        headers: req.headers,
        protocol: req.protocol,
        originalUrl: req.originalUrl
      }
    };
    
    // Define cabeçalhos para evitar cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Retorna os dados de status
    res.status(200).json(statusData);
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter status da API',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook da Evolution API
router.post('/webhook', webhookController.handleWebhook);

// Rota para obter informações do webhook
router.get('/webhook-info', (req, res) => {
  // Obtendo a URL base da requisição
  const protocol = req.protocol;
  const host = req.get('host');
  const baseUrl = `${protocol}://${host}`;
  const webhookUrl = `${baseUrl}/api/webhook`;
  
  res.status(200).json({
    success: true,
    webhookUrl: webhookUrl,
    message: 'Configure esta URL no painel da Evolution API como URL de webhook'
  });
});

// Rota de estatísticas
router.get('/stats', async (req, res) => {
  console.log('=== Processando requisição /stats ===');
  
  // Adicionar cabeçalhos CORS e anti-cache
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  try {
    // Verificar estado da conexão com MongoDB
    const isDbConnected = mongoose.connection.readyState === 1;
    console.log(`Status da conexão MongoDB: ${isDbConnected ? 'Conectado' : 'Desconectado'}`);
    
    let clientCount = 0;
    let messageCount = 0;
    let promotionCount = 0;
    let deliveryRate = 0;
    
    // Se estivermos conectados ao banco de dados, buscar dados reais
    if (isDbConnected) {
      console.log('Buscando dados estatísticos do banco de dados...');
      
      try {
        clientCount = await Client.countDocuments({ status: { $ne: 'deleted' } });
        messageCount = await Message.countDocuments();
        promotionCount = await Promotion.countDocuments({ status: 'active' });
        
        const deliveredCount = await Message.countDocuments({ status: 'delivered' });
        deliveryRate = messageCount > 0 ? Math.round((deliveredCount / messageCount) * 100) : 0;
        
        console.log(`Contagem de clientes: ${clientCount}`);
        console.log(`Contagem de mensagens: ${messageCount}`);
        console.log(`Contagem de promoções: ${promotionCount}`);
        console.log(`Taxa de entrega: ${deliveryRate}% (${deliveredCount}/${messageCount})`);
      } catch (dbError) {
        console.error('Erro ao consultar banco de dados:', dbError);
      }
    } else {
      console.log('Banco de dados desconectado. Dados estatísticos serão zero.');
    }
    
    // Preparar resposta com estrutura consistente
    const statsData = {
      success: true,
      clients: clientCount,
      messages: messageCount,
      promotions: promotionCount,
      deliveryRate: `${deliveryRate}%`,
      timestamp: new Date().toISOString(),
      dbStatus: {
        connected: isDbConnected,
        readyState: mongoose.connection.readyState
      }
    };
    
    console.log('Enviando resposta de estatísticas:', statsData);
    res.json(statsData);
    console.log('=== Requisição /stats concluída com sucesso ===');
  } catch (error) {
    console.error('=== ERRO na requisição /stats ===', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Erro ao processar estatísticas',
      timestamp: new Date().toISOString()
    });
  }
});

// Rota para testar recebimento do webhook
router.get('/webhook-test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Endpoint de webhook está ativo e pronto para receber eventos da Evolution API',
    configTips: [
      'Certifique-se de configurar este endpoint no painel da Evolution API',
      'Eventos suportados: messages.upsert, status.instance, message.ack, etc.'
    ]
  });
});

// Rota para registrar mensagens para envio posterior (sem envio direto)
router.post('/schedule-message', async (req, res) => {
  try {
    const { phone, message, mediaUrl, scheduledDate } = req.body;
    
    if (!phone || !message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Telefone e mensagem são obrigatórios' 
      });
    }
    
    // Armazena a mensagem no banco de dados para envio posterior
    const scheduledMessage = await messageService.scheduleMessage({
      phone,
      message,
      mediaUrl,
      scheduledDate: scheduledDate || new Date()
    });
    
    return res.status(200).json({
      success: true,
      message: 'Mensagem agendada com sucesso',
      scheduledId: scheduledMessage._id
    });
  } catch (error) {
    console.error('Erro ao agendar mensagem:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno ao agendar mensagem',
      error: error.message
    });
  }
});

// Rota para obter promoções recentes
router.get('/promotions/recent', async (req, res) => {
  try {
    // Obter promoções recentes ordenadas por data
    const recentPromotions = await Promotion.find()
      .sort({ createdAt: -1 })
      .limit(5);
    
    // Formatar dados para o frontend
    const formattedPromotions = recentPromotions.map(promo => {
      return {
        name: promo.title || promo.name,
        date: promo.scheduledDate || promo.createdAt,
        recipients: promo.recipients?.length || 0,
        status: promo.status === 'active' ? 'Ativa' : 
               promo.status === 'completed' ? 'Enviada' : 'Agendada',
        openRate: `${Math.round(Math.random() * 80)}%` // Temporário até implementar rastreamento real
      };
    });
    
    res.status(200).json(formattedPromotions);
  } catch (error) {
    console.error('Erro ao obter promoções recentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter promoções recentes',
      error: error.message
    });
  }
});

module.exports = router;
