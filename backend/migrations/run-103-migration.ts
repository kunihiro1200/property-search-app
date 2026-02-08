/**
 * Migration 103: Remove NOT NULL constraint from buyer_id column
 * 
 * Reason: buyer_id is not used in the application, buyer_number is the primary key
 */
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function runMigration() {
  // PostgreSQL接続文字列を構築
  const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
  
  if (!connectionString) {
    console.error('❌ SUPABASE_DB_URL or DATABASE_URL not found in environment');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  console.log('🔄 Running migration 103: Remove NOT NULL constraint from buyer_id...\n');

  // Read SQL file
  const sqlPath = path.join(__dirname, '103_remove_buyer_id_not_null_constraint.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  console.log('📄 SQL to execute:');
  console.log(sql);
  console.log('\n');

  try {
    // Execute migration
    await pool.query(sql);
    console.log('✅ Migration 103 completed successfully\n');

    // Verify the change
    console.log('🔍 Verifying the change...\n');

    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'buyers' AND column_name = 'buyer_id';
    `);

    console.log('📊 buyer_id column info:');
    console.log(result.rows[0]);
    console.log('\n');

    if (result.rows[0] && result.rows[0].is_nullable === 'YES') {
      console.log('✅ buyer_id column is now nullable\n');
    } else {
      console.log('⚠️  buyer_id column is still NOT NULL\n');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration().catch(console.error);
