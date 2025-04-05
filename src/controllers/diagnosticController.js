/**
 * Controlador para diagnósticos do sistema
 */
const diagnostics = require('../utils/diagnostics');
const logger = require('../utils/logger');

/**
 * Executa todos os diagnósticos e retorna os resultados
 */
exports.runDiagnostics = async (req, res) => {
  try {
    logger.info('Iniciando diagnóstico completo do sistema');
    
    const results = await diagnostics.runAllDiagnostics();
    
    logger.info(`Diagnóstico concluído em ${results.duration} segundos`);
    
    res.status(200).json({
      success: true,
      data: results
    });
  } catch (error) {
    logger.error(`Erro ao executar diagnósticos: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao executar diagnósticos: ${error.message}`
    });
  }
};

/**
 * Gera um relatório de diagnóstico
 */
exports.generateReport = async (req, res) => {
  try {
    logger.info('Gerando relatório de diagnóstico');
    
    const report = diagnostics.generateReport();
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    logger.error(`Erro ao gerar relatório: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao gerar relatório: ${error.message}`
    });
  }
};

/**
 * Verifica a conexão com o banco de dados
 */
exports.checkDatabase = async (req, res) => {
  try {
    logger.info('Verificando conexão com o banco de dados');
    
    await diagnostics.checkDatabaseConnection();
    await diagnostics.checkCollections();
    
    res.status(200).json({
      success: true,
      data: {
        database: diagnostics.results.database
      }
    });
  } catch (error) {
    logger.error(`Erro ao verificar banco de dados: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao verificar banco de dados: ${error.message}`
    });
  }
};

/**
 * Verifica a conexão com o WhatsApp
 */
exports.checkWhatsApp = async (req, res) => {
  try {
    logger.info('Verificando conexão com o WhatsApp');
    
    await diagnostics.checkWhatsAppConnection();
    
    res.status(200).json({
      success: true,
      data: {
        whatsapp: diagnostics.results.whatsapp
      }
    });
  } catch (error) {
    logger.error(`Erro ao verificar WhatsApp: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao verificar WhatsApp: ${error.message}`
    });
  }
};

/**
 * Verifica o sistema de arquivos
 */
exports.checkFileSystem = async (req, res) => {
  try {
    logger.info('Verificando sistema de arquivos');
    
    await diagnostics.checkFileSystem();
    
    res.status(200).json({
      success: true,
      data: {
        filesystem: diagnostics.results.filesystem
      }
    });
  } catch (error) {
    logger.error(`Erro ao verificar sistema de arquivos: ${error.message}`);
    
    res.status(500).json({
      success: false,
      message: `Erro ao verificar sistema de arquivos: ${error.message}`
    });
  }
}; 