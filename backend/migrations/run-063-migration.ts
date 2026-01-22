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
    console.log('Starting migration 063: Add viewing_notes and latest_status to sellers...');
    
    // Read the migration file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '063_add_viewing_notes_and_latest_status_to_sellers.sql'),
      'utf8'
    );
    
    // Execute the migration
    await client.query('BEGIN');
    await client.query(migrationSQL);
    await client.query('COMMIT');
    
    console.log('✅ Migration 063 completed successfully!');
    console.log('Added columns:');
    console.log('  - viewing_notes (TEXT)');
    console.log('  - latest_status (TEXT)');
    console.log('  - Index on latest_status');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Migration 063 failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the migration
runMigration().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
