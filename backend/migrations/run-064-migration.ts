import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('Starting migration 064...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '064_add_viewing_notes_and_latest_status_to_buyers.sql'),
      'utf8'
    );
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('Migration 064 completed successfully!');
    console.log('Added viewing_notes and latest_status columns to buyers table');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration 064 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
