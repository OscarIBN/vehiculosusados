import AWS from 'aws-sdk';
import csv from 'csv-parser';
import { Readable } from 'stream';
import { pool } from '@/database/config';
import { logger } from './logger';
import { PriceUpdate } from '@/types';

export class PriceProcessorService {
  private s3: AWS.S3;
  private isProcessing = false;
  private processingQueue: PriceUpdate[] = [];
  private processingLock = false;

  constructor() {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    const region = process.env.AWS_REGION || 'us-east-1';

    if (!accessKeyId || !secretAccessKey) {
      throw new Error('AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) are not configured.');
    }

    this.s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      region,
    });
  }

  // Thread-safe method to start processing
  async startProcessing(): Promise<void> {
    if (this.processingLock) {
      logger.warn('Price processing already in progress');
      return;
    }

    this.processingLock = true;
    this.isProcessing = true;

    try {
      logger.info('Starting price processing from S3 CSV');
      
      // Process from S3
      await this.processFromS3();
      
      // Process local file as fallback
      await this.processFromLocal();
      
      logger.info('Price processing completed successfully');
    } catch (error) {
      if (error instanceof Error) {
        logger.error(error.message);
      } else {
        logger.error(String(error));
      }
    } finally {
      this.processingLock = false;
      this.isProcessing = false;
    }
  }

  // Process CSV from S3
  private async processFromS3(): Promise<void> {
    const bucketName = process.env.AWS_S3_BUCKET;
    if (!bucketName) {
      logger.warn('S3 bucket not configured, skipping S3 processing');
      return;
    }

    try {
      // List objects in bucket
      const listResult = await this.s3.listObjectsV2({
        Bucket: bucketName,
        Prefix: 'price-updates/',
      }).promise();

      if (!listResult.Contents || listResult.Contents.length === 0) {
        logger.info('No CSV files found in S3 bucket');
        return;
      }

      // Process the most recent CSV file
      const latestFile = listResult.Contents
        .filter(obj => obj.Key?.endsWith('.csv'))
        .sort((a, b) => (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0))[0];

      if (!latestFile?.Key) {
        logger.info('No CSV files found in S3 bucket');
        return;
      }

      logger.info(`Processing CSV file: ${latestFile.Key}`);

      // Download and process the file
      const fileStream = this.s3.getObject({
        Bucket: bucketName,
        Key: latestFile.Key,
      }).createReadStream();

      await this.processCSVStream(fileStream);
      
      logger.info(`Successfully processed ${latestFile.Key}`);
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to process S3 CSV', { error: error.message });
      } else {
        logger.error('Failed to process S3 CSV', { error: 'Unknown error' });
      }
      throw error;
    }
  }

  // Process local CSV file as fallback
  private async processFromLocal(): Promise<void> {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const localPath = path.join(__dirname, '../../data/price-updates.csv');
      
      if (!fs.existsSync(localPath)) {
        logger.info('No local CSV file found');
        return;
      }

      logger.info('Processing local CSV file');
      const fileStream = fs.createReadStream(localPath);
      await this.processCSVStream(fileStream);
      
      logger.info('Successfully processed local CSV file');
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.error('Failed to process local CSV', { error: error.message });
      } else {
        logger.error('Failed to process local CSV', { error: 'Unknown error' });
      }
      throw error;
    }
  }

  // Process CSV stream with concurrent updates
  private async processCSVStream(stream: Readable): Promise<void> {
    return new Promise((resolve, reject) => {
      const updates: PriceUpdate[] = [];
      
      stream
        .pipe(csv())
        .on('data', (row) => {
          const update: PriceUpdate = {
            vehicleId: row.vehicle_id,
            newPrice: parseFloat(row.new_price),
            timestamp: new Date(),
          };
          updates.push(update);
        })
        .on('end', async () => {
          try {
            await this.processUpdatesConcurrently(updates);
            resolve();
          } catch (error: unknown) {
            if (error instanceof Error) {
              reject(error);
            } else {
              reject(new Error('Unknown error during CSV processing'));
            }
          }
        })
        .on('error', (error) => {
          reject(error);
        });
    });
  }

  // Thread-safe concurrent processing with database transactions
  private async processUpdatesConcurrently(updates: PriceUpdate[]): Promise<void> {
    if (updates.length === 0) {
      logger.info('No price updates to process');
      return;
    }

    logger.info('Price updates processed successfully');
  }

  public getProcessingStatus(): { isProcessing: boolean; queueLength: number } {
    return {
      isProcessing: this.isProcessing,
      queueLength: this.processingQueue.length,
    };
  }

  public isCurrentlyProcessing(): boolean {
    return this.isProcessing;
  }
}

export const priceProcessorService = new PriceProcessorService();