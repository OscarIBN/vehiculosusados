import { Request, Response } from 'express';
import { testConnection } from '@/database/config';
import { redisService } from '@/services/redis';
import { metricsService } from '@/services/metrics';
import { logger } from '@/services/logger';
import { HealthCheckResponse } from '@/types';

export class HealthController {
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const startTime = Date.now();
      const uptime = process.uptime();

      // Check database connection
      const dbHealthy = await testConnection();

      // Check Redis connection
      const redisHealthy = await redisService.ping();

      // Get metrics data
      const metricsData = await metricsService.getMetricsData();

      // Determine overall health
      const isHealthy = dbHealthy && redisHealthy;

      const response: HealthCheckResponse = {
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        uptime,
        dependencies: {
          database: dbHealthy ? 'healthy' : 'unhealthy',
          redis: redisHealthy ? 'healthy' : 'unhealthy',
        },
        metrics: metricsData,
      };

      const statusCode = isHealthy ? 200 : 503;
      res.status(statusCode).json({
        success: true,
        data: response,
      });

      // Log health check
      logger.info('Health check performed', {
        status: response.status,
        duration: Date.now() - startTime,
        dependencies: response.dependencies,
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'health_check' });
      res.status(503).json({
        success: false,
        error: 'Health check failed',
      });
    }
  }

  async metrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await metricsService.getMetrics();

      res.set('Content-Type', 'text/plain');
      res.send(metrics);
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_metrics' });
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics',
      });
    }
  }

  async systemInfo(req: Request, res: Response): Promise<void> {
    try {
      const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        pid: process.pid,
        environment: process.env.NODE_ENV,
        timestamp: new Date(),
      };

      res.json({
        success: true,
        data: systemInfo,
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_system_info' });
      res.status(500).json({
        success: false,
        error: 'Failed to get system info',
      });
    }
  }

  async priceProcessorStatus(req: Request, res: Response): Promise<void> {
    try {
      const { priceProcessorService } = await import('@/services/priceProcessor');
      const status = priceProcessorService.getProcessingStatus();

      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_price_processor_status' });
      res.status(500).json({
        success: false,
        error: 'Failed to get price processor status',
      });
    }
  }

  async triggerPriceProcessing(req: Request, res: Response): Promise<void> {
    try {
      const { priceProcessorService } = await import('@/services/priceProcessor');
      
      if (priceProcessorService.isCurrentlyProcessing()) {
        res.status(409).json({
          success: false,
          error: 'Price processing already in progress',
        });
        return;
      }

      // Start processing in background
      priceProcessorService.startProcessing().catch(error => {
        logger.logError(error as Error, { operation: 'background_price_processing' });
      });

      res.json({
        success: true,
        message: 'Price processing started',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'trigger_price_processing' });
      res.status(500).json({
        success: false,
        error: 'Failed to trigger price processing',
      });
    }
  }
}

export const healthController = new HealthController(); 