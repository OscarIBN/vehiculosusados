import { Request, Response, NextFunction } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { VehicleStatus, OrderStatus, UserRole } from '@/types';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
    });
    return;
  }
  next();
};

// Vehicle validation rules
export const validateCreateVehicle = [
  body('brand').trim().isLength({ min: 1, max: 100 }).withMessage('Brand is required and must be 1-100 characters'),
  body('model').trim().isLength({ min: 1, max: 100 }).withMessage('Model is required and must be 1-100 characters'),
  body('year').isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Year must be between 1900 and next year'),
  body('mileage').isInt({ min: 0 }).withMessage('Mileage must be a positive integer'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('mainPhoto').optional().isURL().withMessage('Main photo must be a valid URL'),
  body('technicalSpecs.engine').trim().isLength({ min: 1, max: 200 }).withMessage('Engine specification is required'),
  body('technicalSpecs.transmission').trim().isLength({ min: 1, max: 100 }).withMessage('Transmission is required'),
  body('technicalSpecs.fuelType').trim().isLength({ min: 1, max: 50 }).withMessage('Fuel type is required'),
  body('technicalSpecs.color').trim().isLength({ min: 1, max: 50 }).withMessage('Color is required'),
  body('technicalSpecs.doors').isInt({ min: 2, max: 5 }).withMessage('Doors must be between 2 and 5'),
  body('technicalSpecs.seats').isInt({ min: 2, max: 9 }).withMessage('Seats must be between 2 and 9'),
  body('technicalSpecs.power').optional().isInt({ min: 0 }).withMessage('Power must be a positive integer'),
  body('technicalSpecs.displacement').optional().isInt({ min: 0 }).withMessage('Displacement must be a positive integer'),
  body('status').optional().isIn(Object.values(VehicleStatus)).withMessage('Invalid vehicle status'),
  handleValidationErrors,
];

export const validateUpdateVehicle = [
  param('id').isUUID().withMessage('Invalid vehicle ID'),
  body('brand').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Brand must be 1-100 characters'),
  body('model').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Model must be 1-100 characters'),
  body('year').optional().isInt({ min: 1900, max: new Date().getFullYear() + 1 }).withMessage('Year must be between 1900 and next year'),
  body('mileage').optional().isInt({ min: 0 }).withMessage('Mileage must be a positive integer'),
  body('price').optional().isFloat({ min: 0 }).withMessage('Price must be a positive number'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('mainPhoto').optional().isURL().withMessage('Main photo must be a valid URL'),
  body('status').optional().isIn(Object.values(VehicleStatus)).withMessage('Invalid vehicle status'),
  handleValidationErrors,
];

export const validateVehicleFilters = [
  query('brand').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Brand filter must be 1-100 characters'),
  query('model').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Model filter must be 1-100 characters'),
  query('yearMin').optional().isInt({ min: 1900 }).withMessage('Year minimum must be 1900 or later'),
  query('yearMax').optional().isInt({ min: 1900 }).withMessage('Year maximum must be 1900 or later'),
  query('priceMin').optional().isFloat({ min: 0 }).withMessage('Price minimum must be positive'),
  query('priceMax').optional().isFloat({ min: 0 }).withMessage('Price maximum must be positive'),
  query('mileageMax').optional().isInt({ min: 0 }).withMessage('Mileage maximum must be positive'),
  query('status').optional().isIn(Object.values(VehicleStatus)).withMessage('Invalid vehicle status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// User validation rules
export const validateCreateUser = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').trim().isLength({ min: 1, max: 100 }).withMessage('First name is required and must be 1-100 characters'),
  body('lastName').trim().isLength({ min: 1, max: 100 }).withMessage('Last name is required and must be 1-100 characters'),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid user role'),
  handleValidationErrors,
];

export const validateUpdateUser = [
  param('id').isUUID().withMessage('Invalid user ID'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('firstName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('First name must be 1-100 characters'),
  body('lastName').optional().trim().isLength({ min: 1, max: 100 }).withMessage('Last name must be 1-100 characters'),
  body('role').optional().isIn(Object.values(UserRole)).withMessage('Invalid user role'),
  body('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  handleValidationErrors,
];

export const validateLogin = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
];

// Order validation rules
export const validateCreateOrder = [
  body('vehicleId').isUUID().withMessage('Valid vehicle ID is required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('downPayment').optional().isFloat({ min: 0 }).withMessage('Down payment must be a positive number'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors,
];

export const validateUpdateOrder = [
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status').optional().isIn(Object.values(OrderStatus)).withMessage('Invalid order status'),
  body('totalAmount').optional().isFloat({ min: 0 }).withMessage('Total amount must be a positive number'),
  body('downPayment').optional().isFloat({ min: 0 }).withMessage('Down payment must be a positive number'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters'),
  handleValidationErrors,
];

export const validateUpdateOrderStatus = [
  param('id').isUUID().withMessage('Invalid order ID'),
  body('status').isIn(Object.values(OrderStatus)).withMessage('Valid order status is required'),
  handleValidationErrors,
];

// Pagination validation
export const validatePagination = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
];

// UUID parameter validation
export const validateUUID = [
  param('id').isUUID().withMessage('Invalid ID format'),
  handleValidationErrors,
];

// Refresh token validation
export const validateRefreshToken = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors,
]; 