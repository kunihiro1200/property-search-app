import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Starting migration 014: Add valuation_assigned_by column...\n');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);
  
  try {
    // Check if column already exists
    console.log('📊 Checking if valuation_assigned_by column exists...');
    const { data: columns, error: checkError } = await supabase
      .from('sellers')
      .select('valuation_assigned_by')
      .limit(1);
    
    if (!checkError) {
      console.log('✅ Column valuation_assigned_by already exists!');
      return true;
    }
    
    // Add the column using direct SQL execution
    console.log('📝 Adding valuation_assigned_by column...');
    console.log('⚠️  Note: This requires direct database access.');
    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('');
    console.log('ALTER TABLE sellers');
    console.log('ADD COLUMN IF NOT EXISTS valuation_assigned_by TEXT;');
    console.log('');
    console.log("COMMENT ON COLUMN sellers.valuation_assigned_by IS '査定担当者名';");
    console.log('');
    console.log('After running the SQL, press Enter to verify...');
    
    // Wait for user input
    await new Promise(resolve => {
      process.stdin.once('data', resolve);
    });
    
    console.log('✅ Migration 014 completed successfully!');
    console.log('📊 Added valuation_assigned_by column to sellers table');
    return true;
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

runMigration().then(success => {
  process.exit(success ? 0 : 1);
});
