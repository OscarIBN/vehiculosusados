import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { logger } from '@/services/logger';
import { metricsService } from '@/services/metrics';
import { redisService } from '@/services/redis';
import { closePool } from '@/database/config';

import authRoutes from '@/routes/auth';
import vehicleRoutes from '@/routes/vehicles';
import orderRoutes from '@/routes/orders';
import healthRoutes from '@/routes/health';

dotenv.config();

const app = express();

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
    },
  },
}));

app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://vehiculosusados.com'] 
    : ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.logRequest(req, duration, res.statusCode);
    metricsService.recordRequest(req.method, req.route?.path || req.path, res.statusCode, duration / 1000);
  });
  
  next();
});

const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/auth`, authRoutes);
app.use(`/api/${apiVersion}/vehicles`, vehicleRoutes);
app.use(`/api/${apiVersion}/orders`, orderRoutes);
app.use(`/api/${apiVersion}`, healthRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Vehiculos Usados API',
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
  });
});

app.use((error: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.logError(error, {
    operation: 'global_error_handler',
    url: req.url,
    method: req.method,
    userAgent: req.get('User-Agent'),
  });

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(500).json({
    success: false,
    error: isDevelopment ? error.message : 'Internal server error',
    ...(isDevelopment && { stack: error.stack }),
  });
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  try {
    await redisService.disconnect();
    await closePool();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error during graceful shutdown', { error: error.message });
    } else {
      logger.error('Error during graceful shutdown', { error: String(error) });
    }
    process.exit(1);
  }
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  try {
    await redisService.disconnect();
    await closePool();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      logger.error('Error during graceful shutdown', { error: error.message });
    } else {
      logger.error('Error during graceful shutdown', { error: String(error) });
    }
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { error: error.message, stack: error.stack });
  process.exit(1);
});

export default app; 