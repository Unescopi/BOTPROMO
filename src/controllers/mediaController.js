/**
 * Controlador para gerenciamento de mídia
 */
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

// Diretório para armazenar arquivos de mídia
const UPLOAD_DIR = path.join(__dirname, '../../uploads/media');

// Garantir que o diretório de uploads existe
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Upload de arquivos de mídia
exports.uploadMedia = async (req, res) => {
  try {
    // Verificar se há arquivos para upload
    if (!req.files || Object.keys(req.files).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Nenhum arquivo enviado'
      });
    }

    // Obter o arquivo enviado
    const mediaFile = req.files.file;
    
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'audio/mpeg', 'application/pdf'];
    if (!allowedTypes.includes(mediaFile.mimetype)) {
      return res.status(400).json({
        success: false,
        message: 'Tipo de arquivo não permitido. Apenas imagens, vídeos, áudios e PDFs são aceitos.'
      });
    }
    
    // Limitar tamanho do arquivo (10MB)
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (mediaFile.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        message: 'Arquivo muito grande. Tamanho máximo: 10MB'
      });
    }
    
    // Gerar nome único para o arquivo
    const fileExt = path.extname(mediaFile.name);
    const fileName = `${uuidv4()}${fileExt}`;
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Mover o arquivo para o diretório de uploads
    await mediaFile.mv(filePath);
    
    // Determinar o tipo de mídia
    let mediaType = 'document';
    if (mediaFile.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (mediaFile.mimetype.startsWith('video/')) {
      mediaType = 'video';
    } else if (mediaFile.mimetype.startsWith('audio/')) {
      mediaType = 'audio';
    }
    
    // Construir URL para acesso ao arquivo
    const mediaUrl = `/uploads/media/${fileName}`;
    
    // Registrar o upload
    logger.info(`Arquivo de mídia enviado: ${fileName} (${mediaFile.size} bytes)`);
    
    // Retornar informações do arquivo
    return res.status(200).json({
      success: true,
      message: 'Arquivo enviado com sucesso',
      data: {
        fileName,
        originalName: mediaFile.name,
        size: mediaFile.size,
        mimetype: mediaFile.mimetype,
        mediaType,
        url: mediaUrl
      }
    });
    
  } catch (error) {
    logger.error(`Erro ao fazer upload de mídia: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao fazer upload de mídia: ${error.message}`
    });
  }
};

// Excluir arquivo de mídia
exports.deleteMedia = async (req, res) => {
  try {
    const { fileName } = req.params;
    
    // Validar nome do arquivo
    if (!fileName || fileName.includes('..')) {
      return res.status(400).json({
        success: false,
        message: 'Nome de arquivo inválido'
      });
    }
    
    const filePath = path.join(UPLOAD_DIR, fileName);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Arquivo não encontrado'
      });
    }
    
    // Excluir o arquivo
    fs.unlinkSync(filePath);
    
    logger.info(`Arquivo de mídia excluído: ${fileName}`);
    
    return res.status(200).json({
      success: true,
      message: 'Arquivo excluído com sucesso'
    });
    
  } catch (error) {
    logger.error(`Erro ao excluir mídia: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao excluir mídia: ${error.message}`
    });
  }
};

// Listar arquivos de mídia
exports.listMedia = async (req, res) => {
  try {
    // Ler o diretório de uploads
    const files = fs.readdirSync(UPLOAD_DIR);
    
    // Obter informações de cada arquivo
    const mediaFiles = files.map(fileName => {
      const filePath = path.join(UPLOAD_DIR, fileName);
      const stats = fs.statSync(filePath);
      const fileExt = path.extname(fileName).toLowerCase();
      
      // Determinar o tipo de mídia pelo extensão
      let mediaType = 'document';
      if (['.jpg', '.jpeg', '.png', '.gif'].includes(fileExt)) {
        mediaType = 'image';
      } else if (['.mp4', '.avi', '.mov'].includes(fileExt)) {
        mediaType = 'video';
      } else if (['.mp3', '.wav', '.ogg'].includes(fileExt)) {
        mediaType = 'audio';
      }
      
      return {
        fileName,
        size: stats.size,
        createdAt: stats.birthtime,
        mediaType,
        url: `/uploads/media/${fileName}`
      };
    });
    
    return res.status(200).json({
      success: true,
      count: mediaFiles.length,
      data: mediaFiles
    });
    
  } catch (error) {
    logger.error(`Erro ao listar mídia: ${error.message}`);
    return res.status(500).json({
      success: false,
      message: `Erro ao listar mídia: ${error.message}`
    });
  }
};
