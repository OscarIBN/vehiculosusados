import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { User, UserRole } from '@/types';
import { redisService } from './redis';
import { logger } from './logger';

export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class AuthService {
  private readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private readonly JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';

  generateTokens(user: User): Tokens {
    const payload: TokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = jwt.sign(payload, this.JWT_SECRET, {
      expiresIn: this.ACCESS_TOKEN_EXPIRY,
    });

    const refreshToken = jwt.sign(payload, this.JWT_REFRESH_SECRET, {
      expiresIn: this.REFRESH_TOKEN_EXPIRY,
    });

    this.storeRefreshToken(user.id, refreshToken);

    return { accessToken, refreshToken };
  }

  async verifyAccessToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      return decoded;
    } catch (error) {
      logger.logError(error as Error, { operation: 'verify_access_token' });
      return null;
    }
  }

  async verifyRefreshToken(token: string): Promise<TokenPayload | null> {
    try {
      const decoded = jwt.verify(token, this.JWT_REFRESH_SECRET) as TokenPayload;
      
      const storedToken = await this.getStoredRefreshToken(decoded.userId);
      if (!storedToken || storedToken !== token) {
        return null;
      }

      return decoded;
    } catch (error) {
      logger.logError(error as Error, { operation: 'verify_refresh_token' });
      return null;
    }
  }

  async refreshTokens(refreshToken: string): Promise<Tokens | null> {
    const payload = await this.verifyRefreshToken(refreshToken);
    if (!payload) {
      return null;
    }

    const newTokens = this.generateTokens({
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    } as User);

    await this.revokeRefreshToken(payload.userId);

    return newTokens;
  }

  async revokeAccessToken(token: string): Promise<void> {
    try {
      const payload = await this.verifyAccessToken(token);
      if (payload) {
        const key = `blacklist:access:${token}`;
        const ttl = 15 * 60; // 15 minutes
        await redisService.set(key, 'revoked', ttl);
      }
    } catch (error) {
      logger.logError(error as Error, { operation: 'revoke_access_token' });
    }
  }

  async revokeRefreshToken(userId: string): Promise<void> {
    try {
      await redisService.del(`refresh_token:${userId}`);
    } catch (error) {
      logger.logError(error as Error, { operation: 'revoke_refresh_token' });
    }
  }

  async isTokenRevoked(token: string): Promise<boolean> {
    try {
      const key = `blacklist:access:${token}`;
      return await redisService.exists(key);
    } catch (error) {
      logger.logError(error as Error, { operation: 'check_token_revoked' });
      return false;
    }
  }

  private async storeRefreshToken(userId: string, token: string): Promise<void> {
    try {
      const key = `refresh_token:${userId}`;
      const ttl = 7 * 24 * 60 * 60; // 7 days
      await redisService.set(key, token, ttl);
    } catch (error) {
      logger.logError(error as Error, { operation: 'store_refresh_token' });
    }
  }

  private async getStoredRefreshToken(userId: string): Promise<string | null> {
    try {
      const key = `refresh_token:${userId}`;
      return await redisService.get(key);
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_stored_refresh_token' });
      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async verifyToken(token: string): Promise<TokenPayload | null> {
    return this.verifyAccessToken(token);
  }

  hasRole(userRole: UserRole, requiredRoles: UserRole[]): boolean {
    return requiredRoles.includes(userRole);
  }

  isAdmin(userRole: UserRole): boolean {
    return userRole === UserRole.ADMIN;
  }
}

export const authService = new AuthService(); 