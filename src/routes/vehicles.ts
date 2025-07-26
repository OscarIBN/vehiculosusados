import { Router } from 'express';
import { vehicleController } from '@/controllers/vehicleController';
import { authenticateToken, requireRole, optionalAuth } from '@/middleware/auth';
import {
  validateCreateVehicle,
  validateUpdateVehicle,
  validateVehicleFilters,
  validateUUID,
} from '@/middleware/validation';
import { UserRole } from '@/types';

const router = Router();

// Public routes (with optional auth for analytics)
router.get('/', optionalAuth, validateVehicleFilters, vehicleController.getAll);
router.get('/brands', vehicleController.getBrands);
router.get('/brands/:brand/models', vehicleController.getModels);
router.get('/:id', validateUUID, vehicleController.getById);

// Protected routes
router.post('/', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateCreateVehicle, vehicleController.create);
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateUpdateVehicle, vehicleController.update);
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN]), validateUUID, vehicleController.delete);

// Admin only routes
router.patch('/:id/price', authenticateToken, requireRole([UserRole.ADMIN]), validateUUID, vehicleController.updatePrice);
router.patch('/:id/status', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateUUID, vehicleController.updateStatus);

export default router; 