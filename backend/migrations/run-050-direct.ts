// Run Migration 050 directly using pg client
import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { Pool } from 'pg';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  // Parse Supabase URL to get connection details
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
  
  // Extract database connection info from Supabase URL
  // Format: https://[project-ref].supabase.co
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('Could not parse Supabase project reference from URL');
    process.exit(1);
  }

  // Construct direct database URL
  const databaseUrl = process.env.DATABASE_URL || 
    `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

  console.log('=== Running Migration 050: Fix Remaining Buyer VARCHAR(50) Fields ===\n');
  console.log('Note: This migration requires direct database access.');
  console.log('If this fails, please run the SQL manually in Supabase SQL Editor.\n');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const sqlPath = path.join(__dirname, '050_fix_remaining_buyer_varchar_fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('Executing migration SQL...\n');
    
    await pool.query(sql);
    
    console.log('✅ Migration 050 completed successfully!\n');
    console.log('All remaining VARCHAR(50) fields have been converted to TEXT.');
    console.log('\nNext steps:');
    console.log('1. Run buyer sync: npx ts-node sync-buyers.ts');
    console.log('2. Verify counts: npx ts-node check-buyer-count-comparison.ts');
    
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nPlease run the SQL manually in Supabase SQL Editor:');
    console.error('1. Go to your Supabase project dashboard');
    console.error('2. Open SQL Editor');
    console.error('3. Copy and paste the contents of:');
    console.error('   backend/migrations/050_fix_remaining_buyer_varchar_fields.sql');
    console.error('4. Click "Run"');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
