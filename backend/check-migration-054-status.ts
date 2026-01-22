import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// Parse Supabase connection string
const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL or SUPABASE_DB_URL not found in .env file');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkMigrationStatus() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 Checking Migration 054 status...\n');

    // Check if migrations table exists
    const { rows: migrationTableCheck } = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'migrations'
      );
    `);

    console.log('📋 Migrations table exists:', migrationTableCheck[0].exists);

    if (migrationTableCheck[0].exists) {
      // Check if migration 054 was run
      const { rows: migrationRecords } = await client.query(`
        SELECT id, name, executed_at 
        FROM migrations 
        WHERE name LIKE '%054%' OR name LIKE '%buyers_sync%'
        ORDER BY executed_at DESC;
      `);

      console.log('\n📊 Migration 054 records:');
      if (migrationRecords.length > 0) {
        migrationRecords.forEach(record => {
          console.log(`  ✓ ${record.name} - executed at ${record.executed_at}`);
        });
      } else {
        console.log('  ⚠️  No migration 054 records found!');
      }
    }

    // Check buyers table structure
    console.log('\n🔍 Checking buyers table columns...\n');
    const { rows: columns } = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'buyers'
      ORDER BY ordinal_position;
    `);

    console.log(`✅ Found ${columns.length} columns in buyers table:\n`);
    
    // Group columns by category
    const syncColumns = columns.filter(col => 
      col.column_name.includes('sync') || col.column_name.includes('last_')
    );
    
    const regularColumns = columns.filter(col => 
      !col.column_name.includes('sync') && !col.column_name.includes('last_')
    );

    console.log('📦 Regular columns:');
    regularColumns.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type}`);
    });

    console.log('\n🔄 Sync-related columns:');
    if (syncColumns.length > 0) {
      syncColumns.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    } else {
      console.log('  ⚠️  No sync-related columns found!');
    }

    // Check specifically for Migration 054 columns
    const migration054Columns = ['last_synced_at', 'sync_status', 'sync_error'];
    console.log('\n🎯 Migration 054 columns status:');
    
    let allPresent = true;
    migration054Columns.forEach(colName => {
      const exists = columns.some(col => col.column_name === colName);
      console.log(`  ${colName}: ${exists ? '✅ EXISTS' : '❌ MISSING'}`);
      if (!exists) allPresent = false;
    });

    if (!allPresent) {
      console.log('\n❌ Migration 054 has NOT been applied!');
      console.log('\n📋 To fix this, run:');
      console.log('   cd backend');
      console.log('   npx ts-node migrations/run-054-direct.ts');
    } else {
      console.log('\n✅ Migration 054 columns are present in the database!');
      console.log('\n⚠️  The issue is with PostgREST schema cache.');
      console.log('\n📋 Solutions:');
      console.log('   1. Wait 10-15 minutes for automatic cache refresh');
      console.log('   2. Restart Supabase project from dashboard');
      console.log('   3. Use SQL Editor to run: NOTIFY pgrst, \'reload schema\';');
    }

    // Check if there are any buyers
    const { rows: buyerCount } = await client.query(`
      SELECT COUNT(*) as count FROM buyers;
    `);
    console.log(`\n📊 Total buyers in database: ${buyerCount[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkMigrationStatus()
  .then(() => {
    console.log('\n✨ Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
