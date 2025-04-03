/**
 * Middleware de autenticação
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');

/**
 * Middleware para verificar o token JWT
 */
exports.verifyToken = (req, res, next) => {
  // Obtém o token do cabeçalho Authorization
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(403).json({
      success: false,
      message: 'Token não fornecido'
    });
  }
  
  try {
    // Verifica o token
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Erro na autenticação: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Token inválido ou expirado'
    });
  }
};

/**
 * Middleware para verificar permissões de administrador
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a administradores'
    });
  }
  next();
};

/**
 * Middleware para verificar permissões de operador
 */
exports.isOperator = (req, res, next) => {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'operator')) {
    return res.status(403).json({
      success: false,
      message: 'Acesso restrito a operadores'
    });
  }
  next();
};

/**
 * Middleware para verificar permissões de visualizador
 */
exports.isViewer = (req, res, next) => {
  // Qualquer usuário autenticado pode visualizar
  next();
};
