/**
 * Rotas de autenticação
 */
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Rotas públicas
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password/:token', authController.resetPassword);

// Rotas protegidas
router.get('/me', authMiddleware.verifyToken, authController.getMe);
router.put('/update-profile', authMiddleware.verifyToken, authController.updateProfile);
router.put('/change-password', authMiddleware.verifyToken, authController.changePassword);

// Rotas de administrador
router.get('/users', 
  authMiddleware.verifyToken, 
  authMiddleware.isAdmin, 
  authController.getAllUsers
);

router.post('/users', 
  authMiddleware.verifyToken, 
  authMiddleware.isAdmin, 
  authController.createUser
);

router.put('/users/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.isAdmin, 
  authController.updateUser
);

router.delete('/users/:id', 
  authMiddleware.verifyToken, 
  authMiddleware.isAdmin, 
  authController.deleteUser
);

module.exports = router;
