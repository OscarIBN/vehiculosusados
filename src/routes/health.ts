import { Router } from 'express';
import { healthController } from '@/controllers/healthController';
import { authenticateToken, requireRole } from '@/middleware/auth';
import { UserRole } from '@/types';

const router = Router();

// Public health check
router.get('/healthz', healthController.healthCheck);

// Metrics endpoint (public for Prometheus)
router.get('/metrics', healthController.metrics);

// System info (admin only)
router.get('/system', authenticateToken, requireRole([UserRole.ADMIN]), healthController.systemInfo);

// Price processor status (admin only)
router.get('/price-processor/status', authenticateToken, requireRole([UserRole.ADMIN]), healthController.priceProcessorStatus);
router.post('/price-processor/trigger', authenticateToken, requireRole([UserRole.ADMIN]), healthController.triggerPriceProcessing);

export default router; 