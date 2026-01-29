import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { Client } from 'pg';

dotenv.config();

async function runMigration() {
  console.log('🔄 Running migration: add spreadsheet_url to property_listings...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260129_add_spreadsheet_url_to_property_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📋 Executing migration...');
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully');
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(console.error);
