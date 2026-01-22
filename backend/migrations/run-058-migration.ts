import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting migration 058: Add buyer related indexes...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '058_add_buyer_related_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration 058 completed successfully!');
    console.log('Added indexes:');
    console.log('  - idx_buyers_phone_number');
    console.log('  - idx_buyers_email');
  } catch (error) {
    console.error('❌ Migration 058 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration script failed:', error);
    process.exit(1);
  });
