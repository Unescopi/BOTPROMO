/**
 * Middleware de autenticação
 */
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const logger = require('../utils/logger');
const User = require('../models/User');

/**
 * Middleware para verificar o token JWT
 */
exports.verifyToken = async (req, res, next) => {
  try {
    console.log('=== INÍCIO: verifyToken ===');
    console.log('Headers da requisição:', JSON.stringify(req.headers, null, 2));
    
    // Obter o token do cabeçalho Authorization
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('Token extraído do cabeçalho Authorization:', token ? token.substring(0, 15) + '...' : 'Nenhum');
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('Token extraído dos cookies:', token ? token.substring(0, 15) + '...' : 'Nenhum');
    } else if (req.query && req.query.token) {
      token = req.query.token;
      console.log('Token extraído da query string:', token ? token.substring(0, 15) + '...' : 'Nenhum');
    }
    
    // Verificar se o token existe
    if (!token) {
      console.log('Nenhum token fornecido');
      return res.status(401).json({
        success: false,
        message: 'Acesso não autorizado. Token não fornecido.'
      });
    }
    
    // Verificar o token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret-jwt-cafeteria-bot-2025');
    console.log('Token decodificado:', JSON.stringify(decoded, null, 2));
    
    // Verificar se o usuário existe
    const user = await User.findById(decoded.id);
    if (!user) {
      console.log('Usuário não encontrado para o token fornecido');
      return res.status(401).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Verificar se o usuário está ativo
    if (!user.active) {
      console.log('Usuário inativo');
      return res.status(401).json({
        success: false,
        message: 'Usuário inativo'
      });
    }
    
    // Adicionar o usuário à requisição
    req.user = user;
    console.log('Usuário autenticado:', user.name, '(', user.email, ')');
    
    next();
    console.log('=== FIM: verifyToken ===');
  } catch (error) {
    console.error('=== ERRO: verifyToken ===');
    console.error('Mensagem de erro:', error.message);
    console.error('Stack trace:', error.stack);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado'
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar autenticação'
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
