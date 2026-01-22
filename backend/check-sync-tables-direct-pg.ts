import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function checkSyncTablesDirect() {
  console.log('=== Direct PostgreSQL Sync Tables Check ===\n');

  try {
    // Check if sync_logs table exists
    console.log('1. Checking sync_logs table...');
    const syncLogsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sync_logs'
      ORDER BY ordinal_position;
    `);

    if (syncLogsResult.rows.length === 0) {
      console.log('❌ sync_logs table does not exist');
    } else {
      console.log('✅ sync_logs table exists with columns:');
      syncLogsResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check if error_logs table exists
    console.log('\n2. Checking error_logs table...');
    const errorLogsResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'error_logs'
      ORDER BY ordinal_position;
    `);

    if (errorLogsResult.rows.length === 0) {
      console.log('❌ error_logs table does not exist');
    } else {
      console.log('✅ error_logs table exists with columns:');
      errorLogsResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check if sync_health table exists
    console.log('\n3. Checking sync_health table...');
    const syncHealthResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sync_health'
      ORDER BY ordinal_position;
    `);

    if (syncHealthResult.rows.length === 0) {
      console.log('❌ sync_health table does not exist');
    } else {
      console.log('✅ sync_health table exists with columns:');
      syncHealthResult.rows.forEach((col: any) => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    }

    // Check sellers table for synced_to_sheet_at column
    console.log('\n4. Checking sellers table for synced_to_sheet_at column...');
    const sellersResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'sellers'
        AND column_name = 'synced_to_sheet_at';
    `);

    if (sellersResult.rows.length === 0) {
      console.log('❌ synced_to_sheet_at column does not exist in sellers table');
    } else {
      console.log('✅ synced_to_sheet_at column exists in sellers table');
      console.log(`   Type: ${sellersResult.rows[0].data_type}`);
    }

    // Check which migrations have been run
    console.log('\n5. Checking migration history...');
    const migrationsResult = await pool.query(`
      SELECT id, name, executed_at
      FROM migrations
      WHERE name IN ('026_add_sync_logs', '039_add_sync_health', '052_add_error_logs', '053_add_sync_metadata_columns')
      ORDER BY id;
    `);

    if (migrationsResult.rows.length === 0) {
      console.log('❌ No relevant migrations found');
    } else {
      console.log('✅ Migration history:');
      migrationsResult.rows.forEach((migration: any) => {
        console.log(`   - ${migration.name} (executed: ${migration.executed_at})`);
      });
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

checkSyncTablesDirect().catch(console.error);
