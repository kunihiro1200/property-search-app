import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  console.log('🚀 Running migration 072: Add property inquiries and site_display column...\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Read the migration file
    const migrationPath = path.join(__dirname, '072_add_property_inquiries.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');

    // Execute the migration
    await client.query(migrationSQL);

    console.log('✅ Migration 072 completed successfully!');
    console.log('\n📋 Summary:');
    console.log('  - Added site_display column to property_listings');
    console.log('  - Added remarks column to property_listings');
    console.log('  - Created property_inquiries table');
    console.log('  - Added indexes for performance');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await client.end();
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
