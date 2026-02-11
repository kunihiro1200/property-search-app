import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('🚀 Running migration: add_field_updated_at_columns');
  
  try {
    // Add columns one by one using Supabase API
    console.log('Adding inquiry_hearing_updated_at column...');
    const { error: error1 } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE buyers ADD COLUMN IF NOT EXISTS inquiry_hearing_updated_at TIMESTAMP'
    });
    if (error1) console.log('Note:', error1.message);
    
    console.log('Adding desired_timing_updated_at column...');
    const { error: error2 } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_timing_updated_at TIMESTAMP'
    });
    if (error2) console.log('Note:', error2.message);
    
    console.log('Adding desired_parking_spaces_updated_at column...');
    const { error: error3 } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_parking_spaces_updated_at TIMESTAMP'
    });
    if (error3) console.log('Note:', error3.message);
    
    console.log('Adding desired_price_range_updated_at column...');
    const { error: error4 } = await supabase.rpc('exec', {
      sql: 'ALTER TABLE buyers ADD COLUMN IF NOT EXISTS desired_price_range_updated_at TIMESTAMP'
    });
    if (error4) console.log('Note:', error4.message);
    
    console.log('✅ Migration completed successfully');
    console.log('Note: Indexes and comments should be added manually via Supabase dashboard if needed');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
