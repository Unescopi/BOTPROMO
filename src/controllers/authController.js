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

    // Busca o usuário pelo email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Não há usuário com esse email'
      });
    }

    // Gera token de redefinição de senha
    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    // Cria URL de redefinição
    const resetUrl = `${req.protocol}://${req.get('host')}/reset-password/${resetToken}`;

    // Cria mensagem de email
    const message = `
      Você está recebendo este email porque solicitou a redefinição de senha.
      Por favor, acesse o link abaixo para redefinir sua senha:
      \n\n${resetUrl}\n\n
      Este link expira em 10 minutos.
      Se você não solicitou esta redefinição, por favor ignore este email.
    `;

    try {
      // Envia email
      await sendEmail({
        email: user.email,
        subject: 'Redefinição de Senha - Cafeteria Promo Bot',
        message
      });

      res.status(200).json({
        success: true,
        message: 'Email de redefinição enviado'
      });
    } catch (error) {
      // Se falhar, limpa os campos de redefinição
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error(`Erro ao enviar email: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Erro ao enviar email de redefinição'
      });
    }
  } catch (error) {
    logger.error(`Erro ao processar esqueci senha: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Erro ao processar solicitação'
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
    // Criptografa o token da URL
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(req.params.token)
      .digest('hex');

    // Busca o usuário pelo token
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    // Verifica se o token é válido
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

    // Gera novo token JWT
    const token = user.generateAuthToken();

    res.status(200).json({
      success: true,
      token,
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
      users
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
 * @desc    Criar usuário (admin)
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
      role
    });

    res.status(201).json({
      success: true,
      user: {
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
 * @desc    Atualizar usuário (admin)
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
      user: updatedUser
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
 * @desc    Excluir usuário (admin)
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

    // Não permite excluir a si mesmo
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Você não pode excluir seu próprio usuário'
      });
    }

    await user.remove();

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
