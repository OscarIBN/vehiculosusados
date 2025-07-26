import app from './app';
import { logger } from '@/services/logger';
import { redisService } from '@/services/redis';
import { testConnection } from '@/database/config';
import cron from 'node-cron';
import { priceProcessorService } from '@/services/priceProcessor';

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.error('Failed to connect to database');
      process.exit(1);
    }
    logger.info('Database connected successfully');

    const redisConnected = await redisService.ping();
    if (!redisConnected) {
      logger.warn('Redis connection failed, continuing without cache');
    } else {
      logger.info('Redis connected successfully');
    }

    const server = app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
    });

    cron.schedule('* * * * *', async () => {
      try {
        if (!priceProcessorService.isCurrentlyProcessing()) {
          logger.info('Starting scheduled price processing');
          await priceProcessorService.startProcessing();
        }
      } catch (error) {
        if (error instanceof Error) {
          logger.error('Scheduled price processing failed', { error: error.message });
        } else {
          logger.error('Scheduled price processing failed', { error: String(error) });
        }
      }
    });

    logger.info('Cron job scheduled for price processing');

    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down server');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      logger.info('SIGINT received, shutting down server');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    if (error instanceof Error) {
      logger.error('Failed to start server', { error: error.message });
    } else {
      logger.error('Failed to start server', { error: String(error) });
    }
    process.exit(1);
  }
}

startServer(); 