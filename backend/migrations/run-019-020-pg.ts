import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}

// Extract project reference from URL
const projectRef = supabaseUrl.replace('https://', '').split('.')[0];

// Construct PostgreSQL connection string
// Note: This requires the database password, which is different from the service key
const databaseUrl = process.env.DATABASE_URL || 
  `postgresql://postgres:[YOUR-PASSWORD]@db.${projectRef}.supabase.co:5432/postgres`;

if (databaseUrl.includes('[YOUR-PASSWORD]')) {
  console.error('❌ DATABASE_URL not configured');
  console.error('');
  console.error('Please add DATABASE_URL to your .env file:');
  console.error('DATABASE_URL=postgresql://postgres:[password]@db.' + projectRef + '.supabase.co:5432/postgres');
  console.error('');
  console.error('You can find your database password in:');
  console.error('Supabase Dashboard → Project Settings → Database → Connection string');
  console.error('');
  console.error('Alternatively, run the SQL files manually via Supabase Dashboard SQL Editor.');
  console.error('See MIGRATION_019_020_INSTRUCTIONS.md for details.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function executeSqlFile(filename: string, description: string): Promise<boolean> {
  try {
    console.log(`\n📝 Executing ${filename}...`);
    const sqlPath = path.join(__dirname, filename);
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log(`✅ ${description} completed successfully!`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error executing ${filename}:`, error.message);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting calendar webhook and sync migrations (019-020)...\n');

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful\n');

    // Migration 019
    const success019 = await executeSqlFile(
      '019_add_calendar_webhook_channels.sql',
      'Migration 019 (calendar_webhook_channels table)'
    );

    if (!success019) {
      console.log('\n❌ Migration 019 failed. Stopping.');
      return false;
    }

    // Migration 020
    const success020 = await executeSqlFile(
      '020_add_calendar_sync_tokens.sql',
      'Migration 020 (calendar_sync_tokens table)'
    );

    if (!success020) {
      console.log('\n❌ Migration 020 failed. Stopping.');
      return false;
    }

    console.log('\n✅ All migrations completed successfully!');
    console.log('');
    console.log('📋 Summary of changes:');
    console.log('  Migration 019:');
    console.log('    - Created calendar_webhook_channels table');
    console.log('    - Added indexes for efficient webhook lookups');
    console.log('    - Added foreign key constraint to employees');
    console.log('');
    console.log('  Migration 020:');
    console.log('    - Created calendar_sync_tokens table');
    console.log('    - Added UNIQUE constraint on employee_id');
    console.log('    - Added indexes for sync operations');
    console.log('');
    console.log('🎉 Database is ready for Google Calendar webhook notifications and sync!');
    console.log('');
    console.log('🔍 Run verification: npx ts-node migrations/verify-019-020-migrations.ts');

    return true;
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📖 If automatic execution fails, run migrations manually via Supabase Dashboard');
    console.log('   See MIGRATION_019_020_INSTRUCTIONS.md for instructions');
    return false;
  } finally {
    await pool.end();
  }
}

runMigrations().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
