import { Request, Response } from 'express';
import { authService } from '@/services/auth';
import { userRepository } from '@/repositories/userRepository';
import { logger } from '@/services/logger';
import { UserRole } from '@/types';

export class AuthController {
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, firstName, lastName, role = UserRole.CUSTOMER } = req.body;

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        res.status(409).json({
          success: false,
          error: 'User with this email already exists',
        });
        return;
      }

      const user = await userRepository.create({
        email,
        password,
        firstName,
        lastName,
        role,
        isActive: true,
      });

      const tokens = authService.generateTokens(user);

      logger.logAuthEvent('register_success', user.id);

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          tokens,
        },
        message: 'User registered successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'register' });
      res.status(500).json({
        success: false,
        error: 'Registration failed',
      });
    }
  }

  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      const user = await userRepository.authenticate(email, password);
      if (!user) {
        logger.logAuthEvent('login_failed', undefined, false);
        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
        });
        return;
      }

      const tokens = authService.generateTokens(user);

      logger.logAuthEvent('login_success', user.id);

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
          },
          tokens,
        },
        message: 'Login successful',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'login' });
      res.status(500).json({
        success: false,
        error: 'Login failed',
      });
    }
  }

  async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({
          success: false,
          error: 'Refresh token is required',
        });
        return;
      }

      const newTokens = await authService.refreshTokens(refreshToken);
      if (!newTokens) {
        res.status(401).json({
          success: false,
          error: 'Invalid or expired refresh token',
        });
        return;
      }

      logger.logAuthEvent('token_refresh_success');

      res.json({
        success: true,
        data: {
          tokens: newTokens,
        },
        message: 'Tokens refreshed successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'refresh_token' });
      res.status(500).json({
        success: false,
        error: 'Token refresh failed',
      });
    }
  }

  async logout(req: Request, res: Response): Promise<void> {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (token) {
        await authService.revokeAccessToken(token);
      }

      if (req.user?.userId) {
        await authService.revokeRefreshToken(req.user.userId);
      }

      logger.logAuthEvent('logout_success', req.user?.userId);

      res.json({
        success: true,
        message: 'Logout successful',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'logout' });
      res.status(500).json({
        success: false,
        error: 'Logout failed',
      });
    }
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const user = await userRepository.findById(req.user.userId);
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      res.json({
        success: true,
        data: {
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            isActive: user.isActive,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt,
          },
        },
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_profile' });
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
      });
    }
  }

  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { firstName, lastName, email } = req.body;
      const updates: any = {};

      if (firstName !== undefined) updates.firstName = firstName;
      if (lastName !== undefined) updates.lastName = lastName;
      if (email !== undefined) updates.email = email;

      const updatedUser = await userRepository.update(req.user.userId, updates);
      if (!updatedUser) {
        res.status(404).json({
          success: false,
          error: 'User not found',
        });
        return;
      }

      logger.logAuthEvent('profile_updated', req.user.userId);

      res.json({
        success: true,
        data: {
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            role: updatedUser.role,
            isActive: updatedUser.isActive,
            updatedAt: updatedUser.updatedAt,
          },
        },
        message: 'Profile updated successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_profile' });
      res.status(500).json({
        success: false,
        error: 'Failed to update profile',
      });
    }
  }
}

export const authController = new AuthController(); 