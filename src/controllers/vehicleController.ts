import { Request, Response } from 'express';
import { vehicleRepository } from '@/repositories/vehicleRepository';
import { logger } from '@/services/logger';
import { VehicleFilters, PaginationParams, VehicleStatus } from '@/types';

export class VehicleController {
  async create(req: Request, res: Response): Promise<Response> {
    try {
      const vehicleData = req.body;

      const vehicle = await vehicleRepository.create({
        brand: vehicleData.brand,
        model: vehicleData.model,
        year: vehicleData.year,
        mileage: vehicleData.mileage,
        price: vehicleData.price,
        description: vehicleData.description,
        mainPhoto: vehicleData.mainPhoto,
        technicalSpecs: vehicleData.technicalSpecs,
        status: vehicleData.status || VehicleStatus.AVAILABLE,
      });

      return res.status(201).json({
        success: true,
        data: { vehicle },
        message: 'Vehicle created successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'create_vehicle' });
      return res.status(500).json({
        success: false,
        error: 'Failed to create vehicle',
      });
    }
  }

  async getById(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const vehicle = await vehicleRepository.findById(id);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
        });
      }

      return res.json({
        success: true,
        data: { vehicle },
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_vehicle_by_id', vehicleId: req.params.id });
      return res.status(500).json({
        success: false,
        error: 'Failed to get vehicle',
      });
    }
  }

  async getAll(req: Request, res: Response): Promise<Response> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = (page - 1) * limit;

      const pagination: PaginationParams = {
        page,
        limit,
        offset,
      };

      const filters: VehicleFilters = {};
      
      if (req.query.brand) filters.brand = req.query.brand as string;
      if (req.query.model) filters.model = req.query.model as string;
      if (req.query.yearMin) filters.yearMin = parseInt(req.query.yearMin as string);
      if (req.query.yearMax) filters.yearMax = parseInt(req.query.yearMax as string);
      if (req.query.priceMin) filters.priceMin = parseFloat(req.query.priceMin as string);
      if (req.query.priceMax) filters.priceMax = parseFloat(req.query.priceMax as string);
      if (req.query.mileageMax) filters.mileageMax = parseInt(req.query.mileageMax as string);
      if (req.query.status) filters.status = req.query.status as VehicleStatus;

      const result = await vehicleRepository.findAll(filters, pagination);

      return res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_all_vehicles' });
      return res.status(500).json({
        success: false,
        error: 'Failed to get vehicles',
      });
    }
  }

  async update(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      const updates = req.body;

      const vehicle = await vehicleRepository.update(id, updates);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
        });
      }

      return res.json({
        success: true,
        data: { vehicle },
        message: 'Vehicle updated successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle', vehicleId: req.params.id });
      return res.status(500).json({
        success: false,
        error: 'Failed to update vehicle',
      });
    }
  }

  async delete(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }

      const deleted = await vehicleRepository.delete(id);
      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
        });
      }

      return res.json({
        success: true,
        message: 'Vehicle deleted successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'delete_vehicle', vehicleId: req.params.id });
      return res.status(500).json({
        success: false,
        error: 'Failed to delete vehicle',
      });
    }
  }

  async updatePrice(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      const { price } = req.body;

      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({
          success: false,
          error: 'Valid price is required',
        });
      }

      const vehicle = await vehicleRepository.updatePrice(id, price);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
        });
      }

      return res.json({
        success: true,
        data: { vehicle },
        message: 'Vehicle price updated successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle_price', vehicleId: req.params.id });
      return res.status(500).json({
        success: false,
        error: 'Failed to update vehicle price',
      });
    }
  }

  async updateStatus(req: Request, res: Response): Promise<Response> {
    try {
      const id = req.params.id;
      if (!id) {
        return res.status(400).json({ success: false, error: 'ID is required' });
      }
      const { status } = req.body;

      if (!Object.values(VehicleStatus).includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Valid status is required',
        });
      }

      const vehicle = await vehicleRepository.updateStatus(id, status);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found',
        });
      }

      return res.json({
        success: true,
        data: { vehicle },
        message: 'Vehicle status updated successfully',
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle_status', vehicleId: req.params.id });
      return res.status(500).json({
        success: false,
        error: 'Failed to update vehicle status',
      });
    }
  }

  async getBrands(req: Request, res: Response): Promise<Response> {
    try {
      const brands = [
        'Toyota', 'Honda', 'Ford', 'Volkswagen', 'BMW', 'Mercedes-Benz',
        'Audi', 'Nissan', 'Chevrolet', 'Hyundai', 'Kia', 'Mazda',
        'Subaru', 'Lexus', 'Acura', 'Infiniti', 'Volvo', 'Porsche'
      ];

      return res.json({
        success: true,
        data: { brands },
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_brands' });
      return res.status(500).json({
        success: false,
        error: 'Failed to get brands',
      });
    }
  }

  async getModels(req: Request, res: Response): Promise<Response> {
    try {
      const { brand } = req.params;
      if (!brand) return res.status(400).json({ success: false, error: 'Brand is required' });

      const modelsByBrand: Record<string, string[]> = {
        'Toyota': ['Corolla', 'Camry', 'RAV4', 'Highlander', 'Tacoma', 'Tundra'],
        'Honda': ['Civic', 'Accord', 'CR-V', 'Pilot', 'Ridgeline'],
        'Ford': ['Focus', 'Fusion', 'Escape', 'Explorer', 'F-150'],
        'BMW': ['3 Series', '5 Series', 'X3', 'X5', 'M3', 'M5'],
        'Mercedes-Benz': ['C-Class', 'E-Class', 'S-Class', 'GLC', 'GLE'],
      };

      const models = modelsByBrand[brand] || [];

      return res.json({
        success: true,
        data: { models },
      });
    } catch (error) {
      logger.logError(error as Error, { operation: 'get_models', brand: req.params.brand });
      return res.status(500).json({
        success: false,
        error: 'Failed to get models',
      });
    }
  }
}

export const vehicleController = new VehicleController(); 