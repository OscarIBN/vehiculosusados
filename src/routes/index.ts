import { Router } from 'express';
import authRoutes from './auth';
import vehicleRoutes from './vehicles';
import orderRoutes from './orders';
import healthRoutes from './health';

const router = Router();

// API version prefix
const apiVersion = process.env.API_VERSION || 'v1';

// Mount routes
router.use(`/api/${apiVersion}/auth`, authRoutes);
router.use(`/api/${apiVersion}/vehicles`, vehicleRoutes);
router.use(`/api/${apiVersion}/orders`, orderRoutes);
router.use(`/api/${apiVersion}`, healthRoutes);

export default router; 