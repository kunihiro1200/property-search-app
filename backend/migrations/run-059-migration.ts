import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function runMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting migration 059: Add buyer performance indexes...');

    // Read the SQL file
    const sqlPath = path.join(__dirname, '059_add_buyer_performance_indexes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the migration
    await pool.query(sql);

    console.log('✅ Migration 059 completed successfully');
    console.log('Indexes added:');
    console.log('  - idx_buyers_email');
    console.log('  - idx_buyers_phone_number');
    console.log('  - idx_buyers_reception_date_desc');
    console.log('  - idx_property_listings_property_number');
    console.log('  - idx_buyers_email_phone');

    // Verify indexes
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE indexname IN (
        'idx_buyers_email',
        'idx_buyers_phone_number',
        'idx_buyers_reception_date_desc',
        'idx_property_listings_property_number',
        'idx_buyers_email_phone'
      )
      ORDER BY tablename, indexname;
    `);

    console.log('\nVerified indexes:');
    result.rows.forEach(row => {
      console.log(`  ✓ ${row.tablename}.${row.indexname}`);
    });

  } catch (error) {
    console.error('❌ Migration 059 failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n✅ Migration process completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration process failed:', error);
    process.exit(1);
  });
