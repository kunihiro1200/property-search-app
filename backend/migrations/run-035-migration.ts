import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  console.log('=== Migration 035: Remove property_type constraint ===\n');
  console.log('⚠️  This migration requires direct database access.');
  console.log('\nPlease run the following SQL in your Supabase SQL Editor:\n');
  console.log('----------------------------------------');
  console.log('ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_property_type_check;');
  console.log('----------------------------------------\n');
  console.log('After running the SQL, the property_type column will accept any text value.');
  console.log('This allows storing abbreviated forms from the spreadsheet (戸, マ, 土, etc.).\n');
}

runMigration();
