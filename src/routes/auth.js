/**
 * Rotas de autenticação
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Rotas públicas
router.post('/register', authController.register);
console.log('Rota de login registrada: POST /api/auth/login');
console.log('Registrando rota de login: POST /login');
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Rotas protegidas
router.get('/me', auth.verifyToken, authController.getMe);
router.put('/update-profile', auth.verifyToken, authController.updateProfile);
router.put('/change-password', auth.verifyToken, authController.changePassword);

// Rotas de administrador
router.get('/users', 
  auth.verifyToken, 
  auth.isAdmin, 
  authController.getAllUsers
);

router.post('/users', 
  auth.verifyToken, 
  auth.isAdmin, 
  authController.createUser
);

router.put('/users/:id', 
  auth.verifyToken, 
  auth.isAdmin, 
  authController.updateUser
);

router.delete('/users/:id', 
  auth.verifyToken, 
  auth.isAdmin, 
  authController.deleteUser
);

module.exports = router;
