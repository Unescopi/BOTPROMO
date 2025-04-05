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

// Rota de status
router.get('/status', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API em funcionamento',
    timestamp: new Date(),
    version: '1.0.0'
  });
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

// Rota para estatísticas gerais
router.get('/stats', async (req, res) => {
  try {
    console.log('=== Processando requisição /stats ===');
    
    // Obtém estatísticas básicas do banco de dados
    console.log('Buscando contagem de clientes...');
    const clients = await Client.countDocuments();
    console.log(`Contagem de clientes: ${clients}`);
    
    // Contagem de mensagens da última semana
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    console.log('Buscando contagem de mensagens...');
    const messages = await Message.countDocuments({
      timestamp: { $gte: oneWeekAgo }
    });
    console.log(`Contagem de mensagens: ${messages}`);
    
    // Promoções ativas
    console.log('Buscando contagem de promoções...');
    const promotions = await Promotion.countDocuments({
      status: 'active'
    });
    console.log(`Contagem de promoções: ${promotions}`);
    
    // Cálculo da taxa de entrega
    console.log('Calculando taxa de entrega...');
    const totalSentMessages = await Message.countDocuments({
      direction: 'sent'
    });
    
    const deliveredMessages = await Message.countDocuments({
      direction: 'sent',
      status: { $in: ['delivered', 'read'] }
    });
    
    // Calcula a taxa de entrega (ou define 0 se não houver mensagens)
    const deliveryRateValue = totalSentMessages > 0 
      ? Math.round((deliveredMessages / totalSentMessages) * 100) 
      : 0;
    
    const deliveryRate = `${deliveryRateValue}%`;
    console.log(`Taxa de entrega: ${deliveryRate} (${deliveredMessages}/${totalSentMessages})`);
    
    // Dados a serem retornados
    const statsData = {
      success: true,
      clients,
      messages,
      promotions,
      deliveryRate,
      timestamp: new Date().toISOString()
    };
    
    console.log('Dados de estatísticas:', statsData);
    
    // Define cache-control para evitar problemas de cache
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    // Retorna as estatísticas
    res.status(200).json(statsData);
    console.log('=== Requisição /stats concluída com sucesso ===');
    
  } catch (error) {
    console.error('=== ERRO ao obter estatísticas ===', error);
    
    // Logs detalhados do erro
    console.error('Mensagem de erro:', error.message);
    console.error('Stack de erro:', error.stack);
    
    // Retorna erro
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas',
      error: error.message
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
