import winston from 'winston';
import { Request } from 'express';

export class LoggerService {
  private logger: winston.Logger;

  constructor() {
    const logLevel = process.env.LOG_LEVEL || 'info';
    const logFormat = process.env.LOG_FORMAT || 'json';

    const format = logFormat === 'json' 
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
          })
        );

    this.logger = winston.createLogger({
      level: logLevel,
      format,
      defaultMeta: { service: 'mi-coche-ideal-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
          ),
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });

    // Handle uncaught exceptions
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    // Handle unhandled promise rejections
    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  info(message: string, meta?: any): void {
    this.logger.info(message, meta);
  }

  error(message: string, meta?: any): void {
    this.logger.error(message, meta);
  }

  warn(message: string, meta?: any): void {
    this.logger.warn(message, meta);
  }

  debug(message: string, meta?: any): void {
    this.logger.debug(message, meta);
  }

  // HTTP request logging
  logRequest(req: Request, duration: number, statusCode: number): void {
    this.info('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode,
      duration,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
      userId: (req as any).user?.userId,
    });
  }

  // Error logging with context
  logError(error: Error, context?: any): void {
    this.error('Application Error', {
      message: error.message,
      stack: error.stack,
      context,
    });
  }

  // Database operation logging
  logDatabaseOperation(operation: string, table: string, duration: number): void {
    this.debug('Database Operation', {
      operation,
      table,
      duration,
    });
  }

  // Cache operation logging
  logCacheOperation(operation: string, key: string, hit: boolean): void {
    this.debug('Cache Operation', {
      operation,
      key,
      hit,
    });
  }

  // Authentication logging
  logAuthEvent(event: string, userId?: string, success: boolean = true): void {
    this.info('Authentication Event', {
      event,
      userId,
      success,
    });
  }

  // Business event logging
  logBusinessEvent(event: string, entityType: string, entityId: string, details?: any): void {
    this.info('Business Event', {
      event,
      entityType,
      entityId,
      details,
    });
  }
}

export const logger = new LoggerService(); 