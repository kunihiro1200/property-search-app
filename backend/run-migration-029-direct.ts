import * as dotenv from 'dotenv';

dotenv.config();

async function runMigration() {
  console.log('🚀 Running migration 029 - Removing status and confidence constraints...\n');

  try {
    // Note: These SQL commands need to be run directly in Supabase Studio SQL Editor
    // because Supabase client doesn't support ALTER TABLE commands directly
    
    console.log('⚠️  This migration needs to be run manually in Supabase Studio.');
    console.log('\n📋 Please copy and paste the following SQL into Supabase Studio SQL Editor:\n');
    console.log('-------------------------------------------------------------------');
    console.log(`
-- Migration 029: Remove status and confidence constraints

-- Drop status constraint
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_status_check;

-- Drop confidence constraint  
ALTER TABLE sellers DROP CONSTRAINT IF EXISTS sellers_confidence_level_check;

-- Add comments
COMMENT ON COLUMN sellers.status IS '状況（当社）- スプレッドシートの値をそのまま保存（日本語可）';
COMMENT ON COLUMN sellers.confidence IS '確度 - スプレッドシートの値をそのまま保存（A, B, C, D, E等）';
    `);
    console.log('-------------------------------------------------------------------\n');
    
    console.log('📍 Steps:');
    console.log('1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');
    console.log('\n✅ After running the SQL, come back and run the fix script again.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

runMigration().catch(console.error);
