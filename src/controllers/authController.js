/**
 * Controlador de autenticação
 */
const User = require('../models/User');
const logger = require('../utils/logger');
const crypto = require('crypto');
const sendEmail = require('../utils/email');
const config = require('../config/config');

/**
 * @desc    Registrar um novo usuário
 * @route   POST /api/auth/register
 * @access  Público
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Verifica se o usuário já existe
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }

    // Cria o usuário
    const user = await User.create({
      name,
      email,
      password,
      role: 'viewer' // Papel padrão para novos registros
    });

    // Gera token JWT
    const token = user.generateAuthToken();

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Erro ao registrar usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao registrar usuário'
    });
  }
};

/**
 * @desc    Login de usuário
 * @route   POST /api/auth/login
 * @access  Público
 */
exports.login = async (req, res) => {
  try {
    console.log('Tentativa de login recebida:', req.body);
    console.log('Headers da requisição:', req.headers);
    console.log('URL da requisição:', req.originalUrl);
    console.log('Método da requisição:', req.method);
    
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      console.log('Email ou senha não fornecidos');
      return res.status(400).json({
        success: false,
        message: 'Por favor, forneça email e senha'
      });
    }

    // Busca o usuário pelo email
    console.log('Buscando usuário com email:', email);
    const user = await User.findOne({ email }).select('+password');

    // Verifica se o usuário existe
    if (!user) {
      console.log('Usuário não encontrado');
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    console.log('Usuário encontrado, verificando senha');
    // Verifica se a senha está correta
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Senha incorreta');
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas'
      });
    }

    console.log('Senha correta, gerando token');
    // Gera token JWT
    const token = user.generateAuthToken();

    // Atualiza a data do último login
    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    console.log('Login bem-sucedido para:', email);
    
    // Definindo explicitamente o tipo de conteúdo como JSON
    res.setHeader('Content-Type', 'application/json');
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Erro detalhado no login:', error);
    logger.error(`Erro no login: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login'
    });
  }
};

/**
 * @desc    Obter dados do usuário atual
 * @route   GET /api/auth/me
 * @access  Privado
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    logger.error(`Erro ao obter dados do usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter dados do usuário'
    });
  }
};

/**
 * @desc    Atualizar perfil do usuário
 * @route   PUT /api/auth/update-profile
 * @access  Privado
 */
exports.updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    
    // Verifica se o email já está em uso
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser && existingUser._id.toString() !== req.user.id) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }

    // Atualiza o usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name, email },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role
      }
    });
  } catch (error) {
    logger.error(`Erro ao atualizar perfil: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar perfil'
    });
  }
};

/**
 * @desc    Alterar senha do usuário
 * @route   PUT /api/auth/change-password
 * @access  Privado
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Busca o usuário e inclui a senha para verificação
    const user = await User.findById(req.user.id).select('+password');

    // Verifica se a senha atual está correta
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Senha atual incorreta'
      });
    }

    // Atualiza a senha
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Senha alterada com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao alterar senha: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao alterar senha'
    });
  }
};

/**
 * @desc    Esqueci minha senha
 * @route   POST /api/auth/forgot-password
 * @access  Público
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    
    // Busca o usuário
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Gera token de reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Hash do token e configura data de expiração
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    
    user.resetPasswordExpire = Date.now() + 30 * 60 * 1000; // 30 minutos
    
    await user.save({ validateBeforeSave: false });
    
    // URL para reset de senha
    const resetUrl = `${config.server.baseUrl}/reset-password/${resetToken}`;
    
    const message = `Você está recebendo este email porque solicitou a redefinição de senha. 
    Por favor, clique no link a seguir para redefinir sua senha: ${resetUrl}`;
    
    try {
      await sendEmail({
        email: user.email,
        subject: 'Redefinição de senha',
        message
      });
      
      res.status(200).json({
        success: true,
        message: 'Email enviado'
      });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      
      await user.save({ validateBeforeSave: false });
      
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email'
      });
    }
  } catch (error) {
    logger.error(`Erro ao solicitar reset de senha: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao solicitar reset de senha'
    });
  }
};

/**
 * @desc    Redefinir senha
 * @route   POST /api/auth/reset-password/:token
 * @access  Público
 */
exports.resetPassword = async (req, res) => {
  try {
    // Hash do token
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');
    
    // Busca o usuário pelo token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token inválido ou expirado'
      });
    }
    
    // Define a nova senha
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();
    
    res.status(200).json({
      success: true,
      message: 'Senha redefinida com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao redefinir senha: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao redefinir senha'
    });
  }
};

/**
 * @desc    Obter todos os usuários
 * @route   GET /api/auth/users
 * @access  Admin
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Erro ao listar usuários: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao listar usuários'
    });
  }
};

/**
 * @desc    Criar usuário (por admin)
 * @route   POST /api/auth/users
 * @access  Admin
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    
    // Verifica se o usuário já existe
    const userExists = await User.findOne({ email });
    
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'Email já está em uso'
      });
    }
    
    // Cria o usuário
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'viewer'
    });
    
    res.status(201).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error(`Erro ao criar usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao criar usuário'
    });
  }
};

/**
 * @desc    Atualizar usuário (por admin)
 * @route   PUT /api/auth/users/:id
 * @access  Admin
 */
exports.updateUser = async (req, res) => {
  try {
    const { name, email, role, active } = req.body;
    
    // Verifica se o email já está em uso
    if (email) {
      const existingUser = await User.findOne({ email });
      
      if (existingUser && existingUser._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Email já está em uso'
        });
      }
    }
    
    // Atualiza o usuário
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, active },
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    logger.error(`Erro ao atualizar usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar usuário'
    });
  }
};

/**
 * @desc    Deletar usuário (por admin)
 * @route   DELETE /api/auth/users/:id
 * @access  Admin
 */
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }
    
    // Não permitir a exclusão do próprio admin
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode excluir seu próprio usuário'
      });
    }
    
    await User.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      message: 'Usuário excluído com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao excluir usuário: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao excluir usuário'
    });
  }
};

/**
 * @desc    Logout do usuário
 * @route   POST /api/auth/logout
 * @access  Público
 */
exports.logout = async (req, res) => {
  try {
    // No JWT, o logout geralmente é tratado no cliente
    // removendo o token do armazenamento local
    res.status(200).json({
      success: true,
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    logger.error(`Erro ao fazer logout: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer logout'
    });
  }
};

/**
 * @desc    Atualizar token de acesso
 * @route   POST /api/auth/refresh-token
 * @access  Público
 */
exports.refreshToken = async (req, res) => {
  try {
    // Implementação básica, em produção deve-se usar refresh tokens
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token não fornecido'
      });
    }
    
    // Aqui você implementaria a lógica de refresh token
    // Por simplicidade, retornamos uma resposta de sucesso
    
    res.status(200).json({
      success: true,
      message: 'Implementação de refresh token pendente'
    });
  } catch (error) {
    logger.error(`Erro ao atualizar token: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar token'
    });
  }
};
