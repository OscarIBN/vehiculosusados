import { Router } from 'express';
import { orderController } from '@/controllers/orderController';
import { authenticateToken, requireRole } from '@/middleware/auth';
import {
  validateCreateOrder,
  validateUpdateOrder,
  validateUpdateOrderStatus,
  validateUUID,
  validatePagination,
} from '@/middleware/validation';
import { UserRole } from '@/types';

const router = Router();

// Customer routes
router.post('/', authenticateToken, validateCreateOrder, orderController.create);
router.get('/my', authenticateToken, validatePagination, orderController.getMyOrders);

// Admin and Sales routes
router.get('/', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validatePagination, orderController.getAll);
router.get('/statistics', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), orderController.getStatistics);
router.get('/vehicle/:vehicleId', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateUUID, orderController.getByVehicleId);

// Protected routes (users can only access their own orders)
router.get('/:id', authenticateToken, validateUUID, orderController.getById);
router.put('/:id', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateUpdateOrder, orderController.update);
router.delete('/:id', authenticateToken, requireRole([UserRole.ADMIN]), validateUUID, orderController.delete);

// Status management (Admin and Sales only)
router.patch('/:id/status', authenticateToken, requireRole([UserRole.ADMIN, UserRole.SALES]), validateUpdateOrderStatus, orderController.updateStatus);

export default router; 