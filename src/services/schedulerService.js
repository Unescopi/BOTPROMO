/**
 * Serviço de agendamento para promoções automáticas
 */
const cron = require('node-cron');
const mongoose = require('mongoose');
const config = require('../config/config');
const logger = require('../utils/logger');
const Promotion = require('../models/Promotion');
const Client = require('../models/Client');
const Message = require('../models/Message');
const messageService = require('./messageService');

class SchedulerService {
  constructor() {
    this.tasks = new Map();
    this.initialized = false;
  }
  
  /**
   * Inicializa o agendador
   */
  async initScheduler() {
    if (this.initialized) {
      logger.warn('Agendador já inicializado');
      return;
    }
    
    // Agenda as promoções diárias (ex: 10:00 todos os dias)
    const dailyTime = config.scheduler.dailyPromoTime.split(':');
    const dailyCron = `${dailyTime[1]} ${dailyTime[0]} * * *`;
    
    this.scheduleDailyPromos(dailyCron);
    
    // Agenda as promoções semanais (ex: toda segunda-feira às 12:00)
    const weeklyTime = config.scheduler.weeklyPromoTime.split(':');
    const weeklyDay = config.scheduler.weeklyPromoDay;
    const weeklyCron = `${weeklyTime[1]} ${weeklyTime[0]} * * ${weeklyDay}`;
    
    this.scheduleWeeklyPromos(weeklyCron);
    
    // Tarefa para verificar promoções agendadas a cada 5 minutos
    this.schedulePromotionChecker('*/5 * * * *');
    
    // Tarefa para atualizar status das mensagens a cada 15 minutos
    this.scheduleMessageStatusUpdater('*/15 * * * *');
    
    this.initialized = true;
    logger.info('Serviço de agendamento inicializado com sucesso');
  }
  
  /**
   * Agenda as promoções diárias
   * @param {string} cronExpression - Expressão cron para agendamento
   */
  scheduleDailyPromos(cronExpression) {
    if (!cron.validate(cronExpression)) {
      logger.error(`Expressão cron inválida: ${cronExpression}`);
      return;
    }
    
    this.tasks.set('daily-promos', cron.schedule(cronExpression, async () => {
      logger.info('Executando tarefa de promoções diárias');
      
      try {
        // Busca promoções diárias ativas
        const dailyPromos = await Promotion.find({
          type: 'daily',
          status: 'active',
          'schedule.startDate': { $lte: new Date() },
          $or: [
            { 'schedule.endDate': { $exists: false } },
            { 'schedule.endDate': null },
            { 'schedule.endDate': { $gte: new Date() } }
          ]
        });
        
        if (dailyPromos.length === 0) {
          logger.info('Nenhuma promoção diária encontrada para hoje');
          return;
        }
        
        for (const promo of dailyPromos) {
          // Processa cada promoção
          await this.processPromotion(promo);
        }
      } catch (error) {
        logger.error(`Erro ao processar promoções diárias: ${error.message}`);
      }
    }, {
      timezone: config.scheduler.timezone
    }));
    
    logger.info(`Promoções diárias agendadas: ${cronExpression}`);
  }
  
  /**
   * Agenda as promoções semanais
   * @param {string} cronExpression - Expressão cron para agendamento
   */
  scheduleWeeklyPromos(cronExpression) {
    if (!cron.validate(cronExpression)) {
      logger.error(`Expressão cron inválida: ${cronExpression}`);
      return;
    }
    
    this.tasks.set('weekly-promos', cron.schedule(cronExpression, async () => {
      logger.info('Executando tarefa de promoções semanais');
      
      try {
        // Busca promoções semanais ativas
        const weeklyPromos = await Promotion.find({
          type: 'weekly',
          status: 'active',
          'schedule.startDate': { $lte: new Date() },
          $or: [
            { 'schedule.endDate': { $exists: false } },
            { 'schedule.endDate': null },
            { 'schedule.endDate': { $gte: new Date() } }
          ]
        });
        
        if (weeklyPromos.length === 0) {
          logger.info('Nenhuma promoção semanal encontrada para hoje');
          return;
        }
        
        for (const promo of weeklyPromos) {
          // Processa cada promoção
          await this.processPromotion(promo);
        }
      } catch (error) {
        logger.error(`Erro ao processar promoções semanais: ${error.message}`);
      }
    }, {
      timezone: config.scheduler.timezone
    }));
    
    logger.info(`Promoções semanais agendadas: ${cronExpression}`);
  }
  
  /**
   * Agenda verificação periódica de promoções
   * @param {string} cronExpression - Expressão cron para agendamento
   */
  schedulePromotionChecker(cronExpression) {
    if (!cron.validate(cronExpression)) {
      logger.error(`Expressão cron inválida: ${cronExpression}`);
      return;
    }
    
    this.tasks.set('promo-checker', cron.schedule(cronExpression, async () => {
      logger.info('Verificando promoções agendadas');
      
      try {
        // Busca promoções agendadas que devem ser executadas agora
        const now = new Date();
        const scheduledPromos = await Promotion.find({
          status: 'scheduled',
          'schedule.startDate': { $lte: now },
          $or: [
            { 'schedule.endDate': { $exists: false } },
            { 'schedule.endDate': null },
            { 'schedule.endDate': { $gte: now } }
          ]
        });
        
        if (scheduledPromos.length === 0) {
          logger.debug('Nenhuma promoção agendada para ser executada agora');
          return;
        }
        
        for (const promo of scheduledPromos) {
          // Verifica se a promoção tem expressão cron personalizada
          if (promo.schedule.cronExpression) {
            // Se for promoção com recorrência personalizada, atualiza status e agenda
            promo.status = 'active';
            await promo.save();
            this.scheduleCustomPromo(promo);
          } else {
            // Promoção de envio único (once)
            await this.processPromotion(promo);
            
            // Atualiza status para concluído após processamento
            promo.status = 'completed';
            await promo.save();
          }
        }
      } catch (error) {
        logger.error(`Erro ao verificar promoções agendadas: ${error.message}`);
      }
    }, {
      timezone: config.scheduler.timezone
    }));
    
    logger.info(`Verificador de promoções agendado: ${cronExpression}`);
  }
  
  /**
   * Agenda atualização periódica de status das mensagens
   * @param {string} cronExpression - Expressão cron para agendamento
   */
  scheduleMessageStatusUpdater(cronExpression) {
    if (!cron.validate(cronExpression)) {
      logger.error(`Expressão cron inválida: ${cronExpression}`);
      return;
    }
    
    this.tasks.set('message-status-updater', cron.schedule(cronExpression, async () => {
      logger.info('Atualizando status das mensagens');
      
      try {
        // Busca mensagens que foram enviadas mas não foram confirmadas como entregues ou lidas
        const pendingMessages = await Message.find({
          status: { $in: ['sent'] },
          'deliveryInfo.sentAt': { $exists: true },
          waId: { $exists: true, $ne: null }
        }).limit(100); // Limita para não sobrecarregar
        
        if (pendingMessages.length === 0) {
          logger.debug('Nenhuma mensagem pendente para atualizar status');
          return;
        }
        
        logger.info(`Atualizando status de ${pendingMessages.length} mensagens`);
        
        for (const message of pendingMessages) {
          try {
            // Atualiza o status da mensagem
            await messageService.updateMessageStatus(message);
          } catch (error) {
            logger.error(`Erro ao atualizar status da mensagem ${message._id}: ${error.message}`);
          }
        }
      } catch (error) {
        logger.error(`Erro ao atualizar status das mensagens: ${error.message}`);
      }
    }, {
      timezone: config.scheduler.timezone
    }));
    
    logger.info(`Atualizador de status de mensagens agendado: ${cronExpression}`);
  }
  
  /**
   * Agenda uma promoção personalizada com base na expressão cron
   * @param {object} promotion - Promoção a ser agendada
   */
  scheduleCustomPromo(promotion) {
    const cronExpression = promotion.schedule.cronExpression;
    
    if (!cronExpression || !cron.validate(cronExpression)) {
      logger.error(`Expressão cron inválida para promoção ${promotion._id}: ${cronExpression}`);
      return;
    }
    
    const taskId = `custom-promo-${promotion._id}`;
    
    // Remove tarefa existente se houver
    if (this.tasks.has(taskId)) {
      this.tasks.get(taskId).stop();
      this.tasks.delete(taskId);
    }
    
    // Cria nova tarefa
    this.tasks.set(taskId, cron.schedule(cronExpression, async () => {
      logger.info(`Executando promoção agendada: ${promotion.name} (${promotion._id})`);
      
      try {
        // Recarrega a promoção para garantir dados atualizados
        const reloadedPromo = await Promotion.findById(promotion._id);
        
        if (!reloadedPromo || reloadedPromo.status !== 'active') {
          logger.warn(`Promoção ${promotion._id} não está mais ativa, cancelando execução`);
          return;
        }
        
        // Verifica se está dentro do período válido
        const now = new Date();
        if (
          reloadedPromo.schedule.endDate && 
          new Date(reloadedPromo.schedule.endDate) < now
        ) {
          logger.info(`Promoção ${promotion._id} expirou, marcando como concluída`);
          reloadedPromo.status = 'completed';
          await reloadedPromo.save();
          
          // Para a tarefa
          if (this.tasks.has(taskId)) {
            this.tasks.get(taskId).stop();
            this.tasks.delete(taskId);
          }
          
          return;
        }
        
        // Processa a promoção
        await this.processPromotion(reloadedPromo);
      } catch (error) {
        logger.error(`Erro ao processar promoção agendada ${promotion._id}: ${error.message}`);
      }
    }, {
      timezone: config.scheduler.timezone
    }));
    
    logger.info(`Promoção personalizada agendada: ${promotion.name} (${promotion._id}) - ${cronExpression}`);
  }
  
  /**
   * Processa uma promoção, selecionando clientes e enviando mensagens
   * @param {object} promotion - Promoção a ser processada
   */
  async processPromotion(promotion) {
    logger.info(`Processando promoção: ${promotion.name} (${promotion._id})`);
    
    try {
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
        logger.warn(`Nenhum cliente encontrado para a promoção ${promotion._id}`);
        return;
      }
      
      logger.info(`Enviando promoção para ${clients.length} clientes`);
      
      // Atualiza métricas
      promotion.metrics.totalRecipients = clients.length;
      await promotion.save();
      
      // Envia as mensagens usando messageService
      await messageService.sendBulkPromotion(promotion, clients);
      
    } catch (error) {
      logger.error(`Erro ao processar promoção ${promotion._id}: ${error.message}`);
    }
  }
  
  /**
   * Agenda uma nova promoção
   * @param {object} promotion - Promoção a ser agendada
   */
  async schedulePromotion(promotion) {
    try {
      // Verifica tipo de agendamento
      if (promotion.schedule.recurrence === 'custom' && promotion.schedule.cronExpression) {
        // Promoção com recorrência personalizada
        this.scheduleCustomPromo(promotion);
      } else {
        // Outros tipos de promoções são verificados pelo schedulePromotionChecker
        logger.info(`Promoção ${promotion._id} será verificada pelo agendador periódico`);
      }
      
      // Se a promoção for para começar imediatamente, processa agora
      const now = new Date();
      const startDate = new Date(promotion.schedule.startDate);
      
      if (startDate <= now) {
        promotion.status = 'active';
        await promotion.save();
        
        // Processa agora se for uma promoção de envio único
        if (promotion.schedule.recurrence === 'once') {
          await this.processPromotion(promotion);
          
          // Atualiza status
          promotion.status = 'completed';
          await promotion.save();
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Erro ao agendar promoção ${promotion._id}: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Cancela uma promoção agendada
   * @param {string} promotionId - ID da promoção
   * @returns {boolean} - Sucesso da operação
   */
  cancelScheduledPromotion(promotionId) {
    const taskId = `custom-promo-${promotionId}`;
    
    if (this.tasks.has(taskId)) {
      this.tasks.get(taskId).stop();
      this.tasks.delete(taskId);
      logger.info(`Promoção ${promotionId} cancelada`);
      return true;
    }
    
    logger.warn(`Tarefa para promoção ${promotionId} não encontrada`);
    return false;
  }
  
  /**
   * Para todas as tarefas agendadas
   */
  stopAllTasks() {
    for (const [taskId, task] of this.tasks.entries()) {
      task.stop();
      logger.info(`Tarefa ${taskId} parada`);
    }
    
    this.tasks.clear();
    this.initialized = false;
    logger.info('Todas as tarefas foram paradas');
  }
}

module.exports = new SchedulerService();
