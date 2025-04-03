/**
 * Utilitário para envio de emails
 */
const nodemailer = require('nodemailer');
const config = require('../config/config');
const logger = require('./logger');

/**
 * Função para enviar email
 * @param {Object} options - Opções do email
 * @param {String} options.email - Email do destinatário
 * @param {String} options.subject - Assunto do email
 * @param {String} options.message - Corpo do email
 * @returns {Promise<void>}
 */
const sendEmail = async (options) => {
  try {
    // Cria um transporter com as configurações do servidor SMTP
    // Para desenvolvimento, você pode usar serviços como Mailtrap
    // Para produção, configure um serviço de email real
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: process.env.SMTP_PORT || 2525,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASSWORD || ''
      }
    });

    // Define as opções do email
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Cafeteria Promo Bot <noreply@cafeteriabot.com>',
      to: options.email,
      subject: options.subject,
      text: options.message,
      // Se quiser enviar HTML, descomente a linha abaixo
      // html: options.html
    };

    // Envia o email
    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email enviado: ${info.messageId}`);
  } catch (error) {
    logger.error(`Erro ao enviar email: ${error.message}`);
    throw new Error('Erro ao enviar email');
  }
};

module.exports = sendEmail;
