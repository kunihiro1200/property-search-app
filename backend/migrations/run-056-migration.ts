import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  console.log('🚀 Starting migration 056: Add email_history table');
  console.log('================================================\n');

  try {
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '056_add_email_history.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Migration SQL loaded');
    console.log('\n⚠️  Please execute this SQL in Supabase SQL Editor:');
    console.log('   1. Go to https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq/sql');
    console.log('   2. Copy and paste the SQL below');
    console.log('   3. Click "Run"\n');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    console.log('\n✅ After running the SQL, the following will be created:');
    console.log('  - email_history table');
    console.log('  - Indexes for efficient querying');
    console.log('  - Column comments for documentation');
    console.log('\n🎉 Migration 056 ready to execute!');

  } catch (error) {
    console.error('❌ Error reading migration file:', error);
    process.exit(1);
  }
}

// Run the migration
runMigration();
