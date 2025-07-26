import { pool } from '@/database/config';
import { authService } from '@/services/auth';
import { logger } from '@/services/logger';
import { metricsService } from '@/services/metrics';
import { User, UserRole } from '@/types';

export class UserRepository {
  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const startTime = Date.now();
    
    try {
      // Hash password
      const hashedPassword = await authService.hashPassword(userData.password);

      const query = `
        INSERT INTO users (email, password, first_name, last_name, role, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;

      const values = [
        userData.email,
        hashedPassword,
        userData.firstName,
        userData.lastName,
        userData.role,
        userData.isActive,
      ];

      const result = await pool.query(query, values);
      const createdUser = this.mapRowToUser(result.rows[0]);

      // Record metrics
      metricsService.recordUserCreated();
      logger.logBusinessEvent('user_created', 'user', createdUser.id);

      logger.logDatabaseOperation('CREATE', 'users', Date.now() - startTime);
      return createdUser;
    } catch (error) {
      logger.logError(error as Error, { operation: 'create_user' });
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE id = $1';
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_user_by_id', userId: id });
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User | null> {
    try {
      const query = 'SELECT * FROM users WHERE email = $1';
      const result = await pool.query(query, [email]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapRowToUser(result.rows[0]);
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_user_by_email', email });
      throw error;
    }
  }

  async authenticate(email: string, password: string): Promise<User | null> {
    try {
      const user = await this.findByEmail(email);
      if (!user || !user.isActive) {
        return null;
      }

      const isValidPassword = await authService.comparePassword(password, user.password);
      if (!isValidPassword) {
        return null;
      }

      logger.logAuthEvent('login_success', user.id);
      return user;
    } catch (error) {
      logger.logError(error as Error, { operation: 'authenticate_user', email });
      throw error;
    }
  }

  async update(id: string, updates: Partial<User>): Promise<User | null> {
    const startTime = Date.now();
    
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build dynamic update query
      if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIndex}`);
        values.push(updates.email);
        paramIndex++;
      }

      if (updates.firstName !== undefined) {
        setClauses.push(`first_name = $${paramIndex}`);
        values.push(updates.firstName);
        paramIndex++;
      }

      if (updates.lastName !== undefined) {
        setClauses.push(`last_name = $${paramIndex}`);
        values.push(updates.lastName);
        paramIndex++;
      }

      if (updates.role !== undefined) {
        setClauses.push(`role = $${paramIndex}`);
        values.push(updates.role);
        paramIndex++;
      }

      if (updates.isActive !== undefined) {
        setClauses.push(`is_active = $${paramIndex}`);
        values.push(updates.isActive);
        paramIndex++;
      }

      if (updates.password !== undefined) {
        const hashedPassword = await authService.hashPassword(updates.password);
        setClauses.push(`password = $${paramIndex}`);
        values.push(hashedPassword);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        return this.findById(id);
      }

      values.push(id);
      const query = `
        UPDATE users 
        SET ${setClauses.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await pool.query(query, values);

      if (result.rows.length === 0) {
        return null;
      }

      const updatedUser = this.mapRowToUser(result.rows[0]);

      logger.logBusinessEvent('user_updated', 'user', id, updates);
      logger.logDatabaseOperation('UPDATE', 'users', Date.now() - startTime);

      return updatedUser;
    } catch (error) {
      logger.logError(error as Error, { operation: 'update_user', userId: id });
      throw error;
    }
  }

  async delete(id: string): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      const query = 'DELETE FROM users WHERE id = $1 RETURNING id';
      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        return false;
      }

      logger.logBusinessEvent('user_deleted', 'user', id);
      logger.logDatabaseOperation('DELETE', 'users', Date.now() - startTime);

      return true;
    } catch (error) {
      logger.logError(error as Error, { operation: 'delete_user', userId: id });
      throw error;
    }
  }

  async findAll(limit: number = 100, offset: number = 0): Promise<User[]> {
    try {
      const query = 'SELECT * FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2';
      const result = await pool.query(query, [limit, offset]);

      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_all_users' });
      throw error;
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const query = 'SELECT * FROM users WHERE role = $1 AND is_active = true';
      const result = await pool.query(query, [role]);

      return result.rows.map(row => this.mapRowToUser(row));
    } catch (error) {
      logger.logError(error as Error, { operation: 'find_users_by_role', role });
      throw error;
    }
  }

  async deactivateUser(id: string): Promise<User | null> {
    return this.update(id, { isActive: false });
  }

  async activateUser(id: string): Promise<User | null> {
    return this.update(id, { isActive: true });
  }

  private mapRowToUser(row: any): User {
    return {
      id: row.id,
      email: row.email,
      password: row.password,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role as UserRole,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}

export const userRepository = new UserRepository(); 