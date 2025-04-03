/**
 * Serviço para comunicação via webhook com a Evolution API
 * 
 * Esta versão simplificada do serviço não faz chamadas diretas à API,
 * funcionando apenas como um stub para manter compatibilidade com outros módulos.
 */
const config = require('../config/config');
const logger = require('../utils/logger');

class EvolutionApiService {
  constructor() {
    logger.info('Inicializando serviço de webhook da Evolution API');
    this.instance = 'webhook-only-mode';
  }

  /**
   * Função stub para agendamento de mensagens
   */
  async scheduleMessage(payload) {
    logger.info(`Mensagem agendada para envio posterior via webhook: ${JSON.stringify(payload)}`);
    return {
      success: true,
      message: 'Mensagem agendada para envio posterior. A entrega será feita via webhook.',
      messageId: `scheduled_${Date.now()}`
    };
  }

  /**
   * Função stub para verificação de mensagens
   */
  async getMessageStatus(messageId) {
    logger.info(`Solicitação de status para mensagem ${messageId} - operação não suportada no modo webhook`);
    return {
      success: false,
      status: 'unknown',
      message: 'Verificação de status não disponível no modo webhook'
    };
  }

  /**
   * Função stub para envio de mensagens de texto
   */
  async sendTextMessage(to, message) {
    logger.info(`Tentativa de envio direto de mensagem para ${to} - não suportado no modo webhook`);
    return {
      success: false,
      message: 'Envio direto de mensagens não suportado no modo webhook. Use o agendamento de mensagens.'
    };
  }

  /**
   * Função stub para envio de mensagens com mídia
   */
  async sendMediaMessage(to, mediaUrl, caption) {
    logger.info(`Tentativa de envio direto de mídia para ${to} - não suportado no modo webhook`);
    return {
      success: false,
      message: 'Envio direto de mídia não suportado no modo webhook. Use o agendamento de mensagens.'
    };
  }
}

module.exports = new EvolutionApiService();
