import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function runMigration(migrationFile: string, migrationName: string) {
  console.log(`\n📝 Running ${migrationName}...`);
  
  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations', migrationFile),
      'utf8'
    );

    await pool.query(migrationSQL);
    console.log(`✅ ${migrationName} completed successfully`);
    return true;
  } catch (error: any) {
    console.error(`❌ ${migrationName} failed:`, error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Running sync tables migrations...\n');
  console.log('This will create:');
  console.log('  - sync_logs table (Migration 026)');
  console.log('  - sync_health table (Migration 039)');
  console.log('');

  try {
    // Run migration 026 - sync_logs
    const migration026Success = await runMigration(
      '026_add_sync_logs.sql',
      'Migration 026: Add sync_logs table'
    );

    // Run migration 039 - sync_health
    const migration039Success = await runMigration(
      '039_add_sync_health.sql',
      'Migration 039: Add sync_health table'
    );

    console.log('\n📊 Summary:');
    if (migration026Success && migration039Success) {
      console.log('✅ All migrations completed successfully!');
      console.log('\n✨ Your database now has:');
      console.log('   - sync_logs table for tracking sync operations');
      console.log('   - sync_health table for monitoring sync system health');
      console.log('\n🎉 You can now run your application!');
    } else {
      console.log('⚠️  Some migrations failed. Please check the errors above.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
