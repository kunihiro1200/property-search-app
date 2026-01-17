import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyMigration() {
  try {
    console.log('Verifying migration 023...\n');

    // Test inserting and retrieving data
    console.log('📝 Testing data operations...');

    const testSeller = {
      name: 'Test Seller for Migration 023',
      address: 'Test Address',
      phone_number: '090-0000-0023',
      exclusion_action: '除外日に不通であれば除外'
    };

    const { data: insertData, error: insertError } = await supabase
      .from('sellers')
      .insert(testSeller)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error inserting test data:', insertError);
      console.error('   This might mean the column does not exist yet');
      process.exit(1);
    }

    console.log('✅ Successfully inserted test seller with exclusion_action');

    // Verify the data
    const { data: selectData, error: selectError } = await supabase
      .from('sellers')
      .select('exclusion_action')
      .eq('id', insertData.id)
      .single();

    if (selectError) {
      console.error('❌ Error selecting test data:', selectError);
      process.exit(1);
    }

    if (selectData.exclusion_action !== testSeller.exclusion_action) {
      console.error('❌ exclusion_action value mismatch');
      console.error('   Expected:', testSeller.exclusion_action);
      console.error('   Got:', selectData.exclusion_action);
      process.exit(1);
    }

    console.log('✅ Successfully retrieved exclusion_action:', selectData.exclusion_action);

    // Clean up test data
    const { error: deleteError } = await supabase
      .from('sellers')
      .delete()
      .eq('id', insertData.id);

    if (deleteError) {
      console.error('⚠️  Warning: Could not delete test data:', deleteError);
    } else {
      console.log('✅ Test data cleaned up');
    }

    console.log('\n✅ Migration 023 verification completed successfully!');
  } catch (error) {
    console.error('❌ Unexpected error during verification:', error);
    process.exit(1);
  }
}

verifyMigration();
