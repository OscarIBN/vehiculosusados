import bcrypt from 'bcryptjs';
import { pool } from './config';
import { UserRole, VehicleStatus, OrderStatus } from '@/types';

const seedData = async (): Promise<void> => {
  try {
    console.log('Starting database seeding...');
    
    // Hash password for test users
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Insert test users
    const usersQuery = `
      INSERT INTO users (email, password, first_name, last_name, role) VALUES
      ('admin@micocheideal.com', $1, 'Admin', 'User', 'admin'),
      ('sales@micocheideal.com', $1, 'Sales', 'User', 'sales'),
      ('customer@micocheideal.com', $1, 'Customer', 'User', 'customer')
      ON CONFLICT (email) DO NOTHING
    `;
    
    await pool.query(usersQuery, [hashedPassword]);
    
    // Insert test vehicles
    const vehiclesQuery = `
      INSERT INTO vehicles (brand, model, year, mileage, price, description, technical_specs, status) VALUES
      ('Toyota', 'Corolla', 2020, 45000, 18000.00, 'Excelente estado, un solo dueño', '{"engine": "1.8L 4-Cylinder", "transmission": "Automatic", "fuelType": "Gasoline", "color": "White", "doors": 4, "seats": 5, "power": 139, "displacement": 1798}', 'available'),
      ('Honda', 'Civic', 2019, 38000, 16500.00, 'Muy bien mantenido, bajo kilometraje', '{"engine": "1.5L Turbo", "transmission": "CVT", "fuelType": "Gasoline", "color": "Blue", "doors": 4, "seats": 5, "power": 174, "displacement": 1498}', 'available'),
      ('Ford', 'Focus', 2021, 22000, 19500.00, 'Casi nuevo, garantía de fábrica', '{"engine": "2.0L 4-Cylinder", "transmission": "Automatic", "fuelType": "Gasoline", "color": "Red", "doors": 4, "seats": 5, "power": 162, "displacement": 1999}', 'available'),
      ('Volkswagen', 'Golf', 2018, 65000, 14000.00, 'Buen estado general, económico', '{"engine": "1.4L TSI", "transmission": "Manual", "fuelType": "Gasoline", "color": "Gray", "doors": 4, "seats": 5, "power": 125, "displacement": 1395}', 'available'),
      ('BMW', '3 Series', 2020, 35000, 32000.00, 'Lujo y rendimiento, full equipo', '{"engine": "2.0L Turbo", "transmission": "Automatic", "fuelType": "Gasoline", "color": "Black", "doors": 4, "seats": 5, "power": 248, "displacement": 1998}', 'available')
      ON CONFLICT DO NOTHING
    `;
    
    await pool.query(vehiclesQuery);
    
    // Get user and vehicle IDs for orders
    const userResult = await pool.query('SELECT id FROM users WHERE email = $1', ['customer@micocheideal.com']);
    const vehicleResult = await pool.query('SELECT id FROM vehicles WHERE brand = $1 AND model = $2', ['Toyota', 'Corolla']);
    
    if (userResult.rows.length > 0 && vehicleResult.rows.length > 0) {
      const userId = userResult.rows[0].id;
      const vehicleId = vehicleResult.rows[0].id;
      
      // Insert test order
      const orderQuery = `
        INSERT INTO orders (vehicle_id, user_id, status, total_amount, down_payment, notes) VALUES
        ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `;
      
      await pool.query(orderQuery, [
        vehicleId,
        userId,
        OrderStatus.PENDING,
        18000.00,
        5000.00,
        'Cliente interesado en financiamiento'
      ]);
    }
    
    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedData();
} 