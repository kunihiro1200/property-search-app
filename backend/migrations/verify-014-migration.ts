import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  try {
    console.log('🔍 Verifying Migration 014...');

    // Check if the column exists
    const { data, error } = await supabase
      .from('sellers')
      .select('valuation_assigned_by')
      .limit(1);

    if (error) {
      console.error('❌ Column does not exist or cannot be accessed:', error);
      console.log('\n💡 Try refreshing the Supabase schema cache:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Navigate to Settings > API');
      console.log('   3. Click "Reload schema cache"');
      process.exit(1);
    }

    console.log('✅ Column valuation_assigned_by exists and is accessible');
    console.log('📊 Sample data:', data);
    
  } catch (error) {
    console.error('❌ Verification error:', error);
    process.exit(1);
  }
}

verifyMigration();
