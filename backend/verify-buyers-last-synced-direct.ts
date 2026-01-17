import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyColumn() {
  console.log('🔍 Verifying last_synced_at column in buyers table...\n');

  try {
    // Method 1: Direct SQL query to check column existence
    console.log('Method 1: Checking column via direct SQL query...');
    const { data: columnCheck, error: columnError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'buyers'
          AND column_name = 'last_synced_at';
      `
    });

    if (columnError) {
      console.log('⚠️  RPC method not available, trying alternative...\n');
    } else {
      console.log('✅ Column metadata:', columnCheck);
    }

    // Method 2: Try to select the column directly from buyers table
    console.log('\nMethod 2: Attempting to SELECT last_synced_at...');
    const { data: buyers, error: selectError } = await supabase
      .from('buyers')
      .select('id, last_synced_at')
      .limit(5);

    if (selectError) {
      console.error('❌ FAILED - Column does not exist or is not accessible');
      console.error('Error:', selectError.message);
      console.error('Code:', selectError.code);
      console.error('\n⚠️  This indicates the PostgREST schema cache has not been refreshed.');
      console.error('\n📋 Next steps:');
      console.error('1. Wait 5-10 minutes for automatic cache refresh');
      console.error('2. OR restart your Supabase project from the dashboard');
      console.error('3. OR contact Supabase support if issue persists');
      return false;
    }

    console.log('✅ SUCCESS - Column is accessible!');
    console.log(`Found ${buyers?.length || 0} buyer records`);
    if (buyers && buyers.length > 0) {
      console.log('\nSample data:');
      buyers.forEach((buyer, idx) => {
        console.log(`  ${idx + 1}. ID: ${buyer.id}, last_synced_at: ${buyer.last_synced_at || 'NULL'}`);
      });
    }

    // Method 3: Try to update a record (if any exist)
    if (buyers && buyers.length > 0) {
      console.log('\nMethod 3: Testing UPDATE capability...');
      const testId = buyers[0].id;
      const testTimestamp = new Date().toISOString();
      
      const { error: updateError } = await supabase
        .from('buyers')
        .update({ last_synced_at: testTimestamp })
        .eq('id', testId);

      if (updateError) {
        console.error('❌ UPDATE failed:', updateError.message);
        return false;
      }

      console.log('✅ UPDATE successful');
      
      // Verify the update
      const { data: updated, error: verifyError } = await supabase
        .from('buyers')
        .select('id, last_synced_at')
        .eq('id', testId)
        .single();

      if (verifyError) {
        console.error('❌ Verification failed:', verifyError.message);
        return false;
      }

      console.log('✅ Verification successful');
      console.log(`   Updated timestamp: ${updated.last_synced_at}`);
    }

    console.log('\n✨ All checks passed! The column is fully functional.');
    return true;

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return false;
  }
}

verifyColumn()
  .then((success) => {
    if (success) {
      console.log('\n🎉 Migration 051 is working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Schema cache refresh needed. Please wait or restart Supabase project.');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
