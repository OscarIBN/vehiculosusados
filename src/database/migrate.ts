import { readFileSync } from 'fs';
import { join } from 'path';
import { pool } from './config';

const runMigration = async (): Promise<void> => {
  try {
    console.log('Starting database migration...');
    
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  runMigration();
} 