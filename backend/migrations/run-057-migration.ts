import { createClient } from '@supabase/supabase-js';
import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const databaseUrl = process.env.DATABASE_URL;

if (!supabaseUrl || !supabaseServiceKey || !databaseUrl) {
  console.error('❌ Missing required environment variables');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_KEY, DATABASE_URL');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration 057: Add buyer sync logs table');
  console.log('================================================');

  const client = new Client({
    connectionString: databaseUrl,
  });

  try {
    // Connect to database
    await client.connect();
    console.log('✅ Connected to database');

    // Read the migration file
    const migrationPath = path.join(__dirname, '057_add_buyer_sync_logs.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully');
    console.log('');
    console.log('📊 Verifying table creation...');

    // Verify the table was created
    const { error: verifyError } = await supabase
      .from('buyer_sync_logs')
      .select('*')
      .limit(1);

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      throw verifyError;
    }

    console.log('✅ Table buyer_sync_logs verified');
    console.log('');
    console.log('🎉 Migration 057 completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
