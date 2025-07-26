import { Pool } from 'pg';
import { pool } from '@/database/config';
import { Vehicle, VehicleFilters, PaginationParams, VehicleStatus } from '@/types';
import { logger } from '@/services/logger';

export interface CreateVehicleData {
  brand: string;
  model: string;
  year: number;
  mileage: number;
  price: number;
  description?: string;
  mainPhoto?: string;
  technicalSpecs?: Record<string, any>;
  status?: VehicleStatus;
}

export interface UpdateVehicleData {
  brand?: string;
  model?: string;
  year?: number;
  mileage?: number;
  price?: number;
  description?: string;
  mainPhoto?: string;
  technicalSpecs?: Record<string, any>;
  status?: VehicleStatus;
}

export class VehicleRepository {
  async create(data: CreateVehicleData): Promise<Vehicle | null> {
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO vehicles (brand, model, year, mileage, price, description, main_photo, technical_specs, status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING *
      `;
      
      const values = [
        data.brand,
        data.model,
        data.year,
        data.mileage,
        data.price,
        data.description || null,
        data.mainPhoto || null,
        data.technicalSpecs ? JSON.stringify(data.technicalSpecs) : null,
        data.status || VehicleStatus.AVAILABLE,
      ];

      const result = await client.query(query, values);
      return this.mapRowToVehicle(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'create_vehicle' });
      return null;
    } finally {
      client.release();
    }
  }

  async findById(id: string): Promise<Vehicle | null> {
    const client = await pool.connect();
    try {
      const query = 'SELECT * FROM vehicles WHERE id = $1 AND deleted_at IS NULL';
      const result = await client.query(query, [id]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      return this.mapRowToVehicle(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_vehicle_by_id', vehicleId: id });
      return null;
    } finally {
      client.release();
    }
  }

  async findAll(filters: VehicleFilters = {}, pagination: PaginationParams): Promise<{
    vehicles: Vehicle[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const client = await pool.connect();
    try {
      let whereConditions = ['deleted_at IS NULL'];
      const values: any[] = [];
      let valueIndex = 1;

      // Apply filters
      if (filters.brand) {
        whereConditions.push(`brand ILIKE $${valueIndex}`);
        values.push(`%${filters.brand}%`);
        valueIndex++;
      }

      if (filters.model) {
        whereConditions.push(`model ILIKE $${valueIndex}`);
        values.push(`%${filters.model}%`);
        valueIndex++;
      }

      if (filters.yearMin) {
        whereConditions.push(`year >= $${valueIndex}`);
        values.push(filters.yearMin);
        valueIndex++;
      }

      if (filters.yearMax) {
        whereConditions.push(`year <= $${valueIndex}`);
        values.push(filters.yearMax);
        valueIndex++;
      }

      if (filters.priceMin) {
        whereConditions.push(`price >= $${valueIndex}`);
        values.push(filters.priceMin);
        valueIndex++;
      }

      if (filters.priceMax) {
        whereConditions.push(`price <= $${valueIndex}`);
        values.push(filters.priceMax);
        valueIndex++;
      }

      if (filters.mileageMax) {
        whereConditions.push(`mileage <= $${valueIndex}`);
        values.push(filters.mileageMax);
        valueIndex++;
      }

      if (filters.status) {
        whereConditions.push(`status = $${valueIndex}`);
        values.push(filters.status);
        valueIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM vehicles WHERE ${whereClause}`;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].count);

      // Get paginated results
      const query = `
        SELECT * FROM vehicles 
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${valueIndex} OFFSET $${valueIndex + 1}
      `;
      
      values.push(pagination.limit, pagination.offset);
      const result = await client.query(query, values);

      const vehicles = result.rows.map(row => this.mapRowToVehicle(row));
      const totalPages = Math.ceil(total / pagination.limit);

      return {
        vehicles,
        total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages,
      };
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_all_vehicles' });
      return {
        vehicles: [],
        total: 0,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: 0,
      };
    } finally {
      client.release();
    }
  }

  async update(id: string, data: UpdateVehicleData): Promise<Vehicle | null> {
    const client = await pool.connect();
    try {
      const updateFields: string[] = [];
      const values: any[] = [];
      let valueIndex = 1;

      if (data.brand !== undefined) {
        updateFields.push(`brand = $${valueIndex}`);
        values.push(data.brand);
        valueIndex++;
      }

      if (data.model !== undefined) {
        updateFields.push(`model = $${valueIndex}`);
        values.push(data.model);
        valueIndex++;
      }

      if (data.year !== undefined) {
        updateFields.push(`year = $${valueIndex}`);
        values.push(data.year);
        valueIndex++;
      }

      if (data.mileage !== undefined) {
        updateFields.push(`mileage = $${valueIndex}`);
        values.push(data.mileage);
        valueIndex++;
      }

      if (data.price !== undefined) {
        updateFields.push(`price = $${valueIndex}`);
        values.push(data.price);
        valueIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${valueIndex}`);
        values.push(data.description);
        valueIndex++;
      }

      if (data.mainPhoto !== undefined) {
        updateFields.push(`main_photo = $${valueIndex}`);
        values.push(data.mainPhoto);
        valueIndex++;
      }

      if (data.technicalSpecs !== undefined) {
        updateFields.push(`technical_specs = $${valueIndex}`);
        values.push(JSON.stringify(data.technicalSpecs));
        valueIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${valueIndex}`);
        values.push(data.status);
        valueIndex++;
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE vehicles 
        SET ${updateFields.join(', ')}
        WHERE id = $${valueIndex} AND deleted_at IS NULL
        RETURNING *
      `;
      
      values.push(id);
      const result = await client.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVehicle(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle', vehicleId: id });
      return null;
    } finally {
      client.release();
    }
  }

  async updatePrice(id: string, price: number): Promise<Vehicle | null> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE vehicles 
        SET price = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      
      const result = await client.query(query, [price, id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVehicle(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle_price', vehicleId: id });
      return null;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: string, status: VehicleStatus): Promise<Vehicle | null> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE vehicles 
        SET status = $1, updated_at = NOW()
        WHERE id = $2 AND deleted_at IS NULL
        RETURNING *
      `;
      
      const result = await client.query(query, [status, id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToVehicle(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_vehicle_status', vehicleId: id });
      return null;
    } finally {
      client.release();
    }
  }

  async delete(id: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const query = `
        UPDATE vehicles 
        SET deleted_at = NOW()
        WHERE id = $1 AND deleted_at IS NULL
      `;
      
      const result = await client.query(query, [id]);
      return (result.rowCount ?? 0) > 0;
    } catch (error) {
      logger.logError(error as Error, { operation: 'delete_vehicle', vehicleId: id });
      return false;
    } finally {
      client.release();
    }
  }

  private mapRowToVehicle(row: any): Vehicle {
    return {
      id: row.id,
      brand: row.brand,
      model: row.model,
      year: row.year,
      mileage: row.mileage,
      price: parseFloat(row.price),
      description: row.description,
      mainPhoto: row.main_photo,
      technicalSpecs: row.technical_specs ? JSON.parse(row.technical_specs) : null,
      status: row.status as VehicleStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

export const vehicleRepository = new VehicleRepository(); 