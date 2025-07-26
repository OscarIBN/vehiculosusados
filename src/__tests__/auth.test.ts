import request from 'supertest';
import app from '../app';
import { authService } from '@/services/auth';
import { userRepository } from '@/repositories/userRepository';
import { UserRole } from '@/types';

// Mock the database and services
jest.mock('@/database/config', () => ({
  pool: {
    query: jest.fn(),
    connect: jest.fn(),
  },
  testConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock('@/services/redis', () => ({
  redisService: {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    ping: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@/services/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    logRequest: jest.fn(),
    logError: jest.fn(),
    logAuthEvent: jest.fn(),
    logBusinessEvent: jest.fn(),
    logDatabaseOperation: jest.fn(),
  },
}));

jest.mock('@/services/metrics', () => ({
  metricsService: {
    recordRequest: jest.fn(),
    recordUserCreated: jest.fn(),
  },
}));

describe('Authentication', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    firstName: 'Test',
    lastName: 'User',
  };

  const mockUser = {
    id: 'test-user-id',
    email: testUser.email,
    password: 'hashed-password',
    firstName: testUser.firstName,
    lastName: testUser.lastName,
    role: UserRole.CUSTOMER,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Mock userRepository methods
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateTokens').mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 409 if user already exists', async () => {
      // Mock userRepository to return existing user
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(mockUser);

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('already exists');
    });

    it('should return 400 for invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email',
          password: '123', // too short
        })
        .expect(400);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      // Mock userRepository methods
      jest.spyOn(userRepository, 'authenticate').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateTokens').mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password,
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
      expect(response.body.data.tokens).toBeDefined();
    });

    it('should return 401 for invalid credentials', async () => {
      // Mock authentication to fail
      jest.spyOn(userRepository, 'authenticate').mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword',
        })
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid credentials');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Mock successful registration
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateTokens').mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      refreshToken = registerResponse.body.data.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      // Mock refresh token verification
      jest.spyOn(authService, 'verifyRefreshToken').mockResolvedValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      jest.spyOn(authService, 'refreshTokens').mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.tokens).toBeDefined();
      expect(response.body.data.tokens.accessToken).toBeDefined();
      expect(response.body.data.tokens.refreshToken).toBeDefined();
    });

    it('should return 401 for invalid refresh token', async () => {
      // Mock refresh token verification to fail
      jest.spyOn(authService, 'refreshTokens').mockResolvedValue(null);

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/auth/profile', () => {
    let accessToken: string;

    beforeEach(async () => {
      // Mock successful registration
      jest.spyOn(userRepository, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(userRepository, 'create').mockResolvedValue(mockUser);
      jest.spyOn(authService, 'generateTokens').mockReturnValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      });

      const registerResponse = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      accessToken = registerResponse.body.data.tokens.accessToken;
    });

    it('should get profile with valid token', async () => {
      // Mock token verification and user retrieval
      jest.spyOn(authService, 'verifyAccessToken').mockResolvedValue({
        userId: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      jest.spyOn(userRepository, 'findById').mockResolvedValue(mockUser);

      const response = await request(app)
        .get('/api/v1/auth/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/v1/auth/profile')
        .expect(401);

      expect(response.body.success).toBe(false);
    });
  });
}); 