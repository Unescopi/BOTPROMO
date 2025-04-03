/**
 * Serviço para integração com a Evolution API para WhatsApp
 */
const axios = require('axios');
const config = require('../config/config');
const logger = require('../utils/logger');

class EvolutionApiService {
  constructor() {
    this.baseUrl = config.evolutionAPI.baseUrl;
    this.apiKey = config.evolutionAPI.apiKey;
    this.instance = config.evolutionAPI.instance;
    this.connected = false;
    
    this.axiosInstance = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'apikey': this.apiKey
      }
    });
  }
  
  /**
   * Verifica a conexão com a Evolution API
   * @returns {Promise<boolean>} - Status da conexão
   */
  async checkConnection() {
    try {
      const response = await this.axiosInstance.get(`/instance/connectionState/${this.instance}`);
      
      if (response.data && response.data.state) {
        this.connected = response.data.state === 'open';
        return this.connected;
      }
      
      return false;
    } catch (error) {
      logger.error(`Erro ao verificar conexão com a Evolution API: ${error.message}`);
      this.connected = false;
      return false;
    }
  }
  
  /**
   * Inicia a instância do WhatsApp e mostra QR Code
   * @returns {Promise<object>} - Informações do QR Code
   */
  async startInstance() {
    try {
      const response = await this.axiosInstance.post(`/instance/init`, {
        instanceName: this.instance
      });
      
      if (response.status === 201 || response.status === 200) {
        logger.info(`Instância ${this.instance} iniciada com sucesso!`);
        return await this.getQRCode();
      }
      
      logger.error(`Erro ao iniciar instância: ${response.data}`);
      return null;
    } catch (error) {
      logger.error(`Erro ao iniciar instância: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Obtém o QR Code para conexão
   * @returns {Promise<object>} - Informações do QR Code
   */
  async getQRCode() {
    try {
      const response = await this.axiosInstance.get(`/instance/qrcode/${this.instance}`);
      
      if (response.data && response.data.qrcode) {
        logger.info(`QR Code obtido para a instância ${this.instance}`);
        return {
          qrcode: response.data.qrcode,
          base64: response.data.base64
        };
      }
      
      logger.error(`Erro ao obter QR Code: ${JSON.stringify(response.data)}`);
      return null;
    } catch (error) {
      logger.error(`Erro ao obter QR Code: ${error.message}`);
      return null;
    }
  }
  
  /**
   * Envia mensagem de texto
   * @param {string} phone - Número do telefone do destinatário
   * @param {string} message - Conteúdo da mensagem
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTextMessage(phone, message) {
    try {
      const response = await this.axiosInstance.post(`/message/text/${this.instance}`, {
        number: phone,
        options: {
          delay: 1200
        },
        textMessage: {
          text: message
        }
      });
      
      if (response.data && response.data.key) {
        logger.info(`Mensagem enviada para ${phone}`);
        return {
          success: true,
          messageId: response.data.key.id,
          waId: response.data.key.id
        };
      }
      
      logger.error(`Erro ao enviar mensagem: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Falha ao enviar mensagem' };
    } catch (error) {
      logger.error(`Erro ao enviar mensagem: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia mensagem com mídia (imagem, documento, etc)
   * @param {string} phone - Número do telefone do destinatário
   * @param {string} mediaUrl - URL da mídia ou caminho do arquivo
   * @param {string} caption - Legenda opcional
   * @param {string} mediaType - Tipo de mídia (image, document, etc)
   * @returns {Promise<object>} - Resposta da API
   */
  async sendMediaMessage(phone, mediaUrl, caption = '', mediaType = 'image') {
    try {
      // Verifica se a URL é local ou remota
      let media;
      if (mediaUrl.startsWith('http')) {
        media = { url: mediaUrl };
      } else {
        // Consideramos que é um caminho de arquivo local
        media = { path: mediaUrl };
      }
      
      const endpoint = `/message/${mediaType}/${this.instance}`;
      
      const payload = {
        number: phone,
        options: {
          delay: 1200
        },
        [mediaType]: {
          ...media,
          caption: caption || ''
        }
      };
      
      const response = await this.axiosInstance.post(endpoint, payload);
      
      if (response.data && response.data.key) {
        logger.info(`Mídia enviada para ${phone}`);
        return {
          success: true,
          messageId: response.data.key.id,
          waId: response.data.key.id
        };
      }
      
      logger.error(`Erro ao enviar mídia: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Falha ao enviar mídia' };
    } catch (error) {
      logger.error(`Erro ao enviar mídia: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Envia uma mensagem com template personalizado
   * @param {string} phone - Número do telefone do destinatário
   * @param {object} templateData - Dados do template
   * @returns {Promise<object>} - Resposta da API
   */
  async sendTemplateMessage(phone, templateData) {
    try {
      const response = await this.axiosInstance.post(`/message/template/${this.instance}`, {
        number: phone,
        options: {
          delay: 1200
        },
        templateMessage: templateData
      });
      
      if (response.data && response.data.key) {
        logger.info(`Mensagem de template enviada para ${phone}`);
        return {
          success: true,
          messageId: response.data.key.id,
          waId: response.data.key.id
        };
      }
      
      logger.error(`Erro ao enviar template: ${JSON.stringify(response.data)}`);
      return { success: false, error: 'Falha ao enviar template' };
    } catch (error) {
      logger.error(`Erro ao enviar template: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Verifica o status da mensagem
   * @param {string} messageId - ID da mensagem
   * @returns {Promise<string>} - Status da mensagem
   */
  async getMessageStatus(messageId) {
    try {
      const response = await this.axiosInstance.get(`/message/statusMessage/${this.instance}/${messageId}`);
      
      if (response.data && response.data.status) {
        return response.data.status;
      }
      
      return 'unknown';
    } catch (error) {
      logger.error(`Erro ao verificar status da mensagem: ${error.message}`);
      return 'error';
    }
  }
  
  /**
   * Desconecta a instância
   * @returns {Promise<boolean>} - Resultado da operação
   */
  async disconnect() {
    try {
      const response = await this.axiosInstance.delete(`/instance/logout/${this.instance}`);
      
      if (response.status === 200) {
        this.connected = false;
        logger.info(`Instância ${this.instance} desconectada com sucesso!`);
        return true;
      }
      
      logger.error(`Erro ao desconectar: ${response.data}`);
      return false;
    } catch (error) {
      logger.error(`Erro ao desconectar: ${error.message}`);
      return false;
    }
  }
  
  /**
   * Carrega informações do perfil de um número de telefone
   * @param {string} phone - Número do telefone
   * @returns {Promise<object>} - Informações do perfil
   */
  async getProfileInfo(phone) {
    try {
      const response = await this.axiosInstance.get(`/chat/whatsappProfile/${this.instance}?phone=${phone}`);
      
      if (response.data) {
        return response.data;
      }
      
      return null;
    } catch (error) {
      logger.error(`Erro ao obter informações do perfil: ${error.message}`);
      return null;
    }
  }
}

module.exports = new EvolutionApiService();
