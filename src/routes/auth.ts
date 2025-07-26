import { Router } from 'express';
import { authController } from '@/controllers/authController';
import { authenticateToken } from '@/middleware/auth';
import {
  validateCreateUser,
  validateLogin,
  validateRefreshToken,
} from '@/middleware/validation';

const router = Router();

// Public routes
router.post('/register', validateCreateUser, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/refresh', validateRefreshToken, authController.refreshToken);

// Protected routes
router.post('/logout', authenticateToken, authController.logout);
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

export default router; 