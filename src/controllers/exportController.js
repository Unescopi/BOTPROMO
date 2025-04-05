/**
 * Controlador para exportação de dados
 */
const exporter = require('../utils/exporter');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs');

/**
 * Exporta clientes para JSON
 */
exports.exportClientsToJson = async (req, res) => {
  try {
    logger.info('Iniciando exportação de clientes para JSON');
    
    // Obter filtros da requisição
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    // Exportar clientes
    const result = await exporter.exportClientsToJson(filter);
    
    // Enviar arquivo para download
    const filePath = result.filepath;
    const fileName = result.filename;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo para download: ${err.message}`);
      } else {
        // Remover arquivo após download (opcional)
        // fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    logger.error(`Erro ao exportar clientes para JSON: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao exportar clientes: ${error.message}`
    });
  }
};

/**
 * Exporta clientes para CSV
 */
exports.exportClientsToCsv = async (req, res) => {
  try {
    logger.info('Iniciando exportação de clientes para CSV');
    
    // Obter filtros da requisição
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    // Exportar clientes
    const result = await exporter.exportClientsToCsv(filter);
    
    // Enviar arquivo para download
    const filePath = result.filepath;
    const fileName = result.filename;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo para download: ${err.message}`);
      } else {
        // Remover arquivo após download (opcional)
        // fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    logger.error(`Erro ao exportar clientes para CSV: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao exportar clientes: ${error.message}`
    });
  }
};

/**
 * Exporta clientes para Excel
 */
exports.exportClientsToExcel = async (req, res) => {
  try {
    logger.info('Iniciando exportação de clientes para Excel');
    
    // Obter filtros da requisição
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    // Exportar clientes
    const result = await exporter.exportClientsToExcel(filter);
    
    // Enviar arquivo para download
    const filePath = result.filepath;
    const fileName = result.filename;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo para download: ${err.message}`);
      } else {
        // Remover arquivo após download (opcional)
        // fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    logger.error(`Erro ao exportar clientes para Excel: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao exportar clientes: ${error.message}`
    });
  }
};

/**
 * Exporta promoções para JSON
 */
exports.exportPromotionsToJson = async (req, res) => {
  try {
    logger.info('Iniciando exportação de promoções para JSON');
    
    // Obter filtros da requisição
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    // Exportar promoções
    const result = await exporter.exportPromotionsToJson(filter);
    
    // Enviar arquivo para download
    const filePath = result.filepath;
    const fileName = result.filename;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo para download: ${err.message}`);
      } else {
        // Remover arquivo após download (opcional)
        // fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    logger.error(`Erro ao exportar promoções para JSON: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao exportar promoções: ${error.message}`
    });
  }
};

/**
 * Exporta mensagens para JSON
 */
exports.exportMessagesToJson = async (req, res) => {
  try {
    logger.info('Iniciando exportação de mensagens para JSON');
    
    // Obter filtros da requisição
    const filter = req.query.filter ? JSON.parse(req.query.filter) : {};
    
    // Exportar mensagens
    const result = await exporter.exportMessagesToJson(filter);
    
    // Enviar arquivo para download
    const filePath = result.filepath;
    const fileName = result.filename;
    
    res.download(filePath, fileName, (err) => {
      if (err) {
        logger.error(`Erro ao enviar arquivo para download: ${err.message}`);
      } else {
        // Remover arquivo após download (opcional)
        // fs.unlinkSync(filePath);
      }
    });
  } catch (error) {
    logger.error(`Erro ao exportar mensagens para JSON: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao exportar mensagens: ${error.message}`
    });
  }
};

/**
 * Cria um backup completo do sistema
 */
exports.createFullBackup = async (req, res) => {
  try {
    logger.info('Iniciando backup completo do sistema');
    
    // Criar backup
    const result = await exporter.exportFullBackup();
    
    res.status(200).json({
      success: true,
      message: 'Backup criado com sucesso',
      data: result
    });
  } catch (error) {
    logger.error(`Erro ao criar backup completo: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao criar backup: ${error.message}`
    });
  }
}; 