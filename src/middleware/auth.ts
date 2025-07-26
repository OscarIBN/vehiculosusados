import { Request, Response, NextFunction } from 'express';
import { authService } from '@/services/auth';
import { userRepository } from '@/repositories/userRepository';
import { logger } from '@/services/logger';
import { UserRole, JwtPayload } from '@/types';

// Extend Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Access token required',
      });
      return;
    }

    const payload = await authService.verifyToken(token);
    if (!payload) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
      });
      return;
    }

    // Verify user still exists and is active
    const user = await userRepository.findById(payload.userId);
    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        error: 'User not found or inactive',
      });
      return;
    }

    req.user = payload;
    next();
  } catch (error) {
    logger.logError(error as Error, { operation: 'authenticate_token' });
    res.status(500).json({
      success: false,
      error: 'Authentication failed',
    });
  }
};

export const requireRole = (roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
      });
      return;
    }

    if (!authService.hasRole(req.user.role, roles)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
      });
      return;
    }

    next();
  };
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (!authService.isAdmin(req.user.role)) {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
};

export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const payload = await authService.verifyToken(token);
      if (payload) {
        const user = await userRepository.findById(payload.userId);
        if (user && user.isActive) {
          req.user = payload;
        }
      }
    }

    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
}; 