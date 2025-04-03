/**
 * Funções de validação para entrada de dados
 */
const path = require('path');
const config = require('../config/config');
const logger = require('./logger');

const validator = {
  /**
   * Valida um número de telefone no formato internacional
   * @param {string} phone - Número de telefone para validar
   * @returns {boolean} - true se válido, false caso contrário
   */
  isValidPhone: (phone) => {
    // Formatos aceitos: +5511999999999, 5511999999999, 11999999999
    const phoneRegex = /^(\+?\d{1,3})?(\d{2})(\d{8,9})$/;
    return phoneRegex.test(phone);
  },

  /**
   * Formata um número de telefone para o padrão da API
   * @param {string} phone - Número de telefone para formatar
   * @returns {string} - Número formatado ou null se inválido
   */
  formatPhone: (phone) => {
    if (!phone) return null;
    
    // Remove caracteres não numéricos
    let cleaned = phone.replace(/\D/g, '');
    
    // Se não começar com 55 (Brasil), adiciona
    if (!cleaned.startsWith('55')) {
      cleaned = '55' + cleaned;
    }
    
    return cleaned;
  },

  /**
   * Valida o tipo de arquivo de acordo com as extensões permitidas
   * @param {string} filename - Nome do arquivo
   * @param {string} type - Tipo de arquivo ('image' ou 'document')
   * @returns {boolean} - true se válido, false caso contrário
   */
  isValidFileType: (filename, type) => {
    if (!filename) return false;
    
    const ext = path.extname(filename).toLowerCase();
    
    if (type === 'image') {
      return config.upload.allowedImageExtensions.includes(ext);
    } else if (type === 'document') {
      return config.upload.allowedDocumentExtensions.includes(ext);
    }
    
    return false;
  },

  /**
   * Valida uma data no formato YYYY-MM-DD
   * @param {string} date - Data para validar
   * @returns {boolean} - true se válida, false caso contrário
   */
  isValidDate: (date) => {
    if (!date) return false;
    
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(date)) return false;
    
    const d = new Date(date);
    const dNum = d.getTime();
    if (!dNum && dNum !== 0) return false;
    
    return d.toISOString().slice(0, 10) === date;
  },

  /**
   * Valida uma expressão cron
   * @param {string} cron - Expressão cron para validar
   * @returns {boolean} - true se válida, false caso contrário
   */
  isValidCron: (cron) => {
    if (!cron) return false;
    
    // Validação básica de formato cron (5 ou 6 campos)
    const cronRegex = /^(\S+\s+){4,5}\S+$/;
    return cronRegex.test(cron);
  },

  /**
   * Valida e sanitiza texto de input
   * @param {string} text - Texto para sanitizar
   * @returns {string} - Texto sanitizado
   */
  sanitizeText: (text) => {
    if (!text) return '';
    
    // Remove caracteres potencialmente perigosos
    return text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
               .trim();
  }
};

module.exports = validator;
