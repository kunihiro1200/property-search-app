import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

async function verifyMigration() {
  console.log('🔍 Verifying Migration 082: Property Listing Sync State Tables\n');

  const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

  const checks = {
    syncStateTable: false,
    syncErrorsTable: false,
    syncStateIndexes: false,
    syncErrorsIndexes: false,
    rlsPolicies: false,
    statisticsView: false,
    triggers: false
  };

  try {
    // Check 1: Verify sync_state table exists
    console.log('1️⃣  Checking property_listing_sync_state table...');
    const { error: syncStateError } = await supabase
      .from('property_listing_sync_state')
      .select('id')
      .limit(1);

    if (!syncStateError || syncStateError.code === 'PGRST116') {
      checks.syncStateTable = true;
      console.log('   ✅ Table exists and is accessible\n');
    } else {
      console.log(`   ❌ Table check failed: ${syncStateError.message}\n`);
    }

    // Check 2: Verify sync_errors table exists
    console.log('2️⃣  Checking property_listing_sync_errors table...');
    const { error: syncErrorsError } = await supabase
      .from('property_listing_sync_errors')
      .select('id')
      .limit(1);

    if (!syncErrorsError || syncErrorsError.code === 'PGRST116') {
      checks.syncErrorsTable = true;
      console.log('   ✅ Table exists and is accessible\n');
    } else {
      console.log(`   ❌ Table check failed: ${syncErrorsError.message}\n`);
    }

    // Check 3: Test insert operations
    console.log('3️⃣  Testing insert operations...');
    const testSync = {
      sync_type: 'manual',
      status: 'queued',
      total_items: 100
    };

    const { data: insertedSync, error: insertError } = await supabase
      .from('property_listing_sync_state')
      .insert(testSync)
      .select()
      .single();

    if (!insertError && insertedSync) {
      console.log('   ✅ Insert operation successful');

      // Test update
      const { error: updateError } = await supabase
        .from('property_listing_sync_state')
        .update({ status: 'in_progress', success_count: 50 })
        .eq('id', insertedSync.id);

      if (!updateError) {
        console.log('   ✅ Update operation successful');
      } else {
        console.log(`   ⚠️  Update operation failed: ${updateError.message}`);
      }

      // Test error insert
      const testError = {
        sync_id: insertedSync.id,
        property_number: 'TEST001',
        error_type: 'validation',
        error_message: 'Test error',
        retry_count: 0
      };

      const { error: errorInsertError } = await supabase
        .from('property_listing_sync_errors')
        .insert(testError);

      if (!errorInsertError) {
        console.log('   ✅ Error tracking insert successful');
      } else {
        console.log(`   ⚠️  Error tracking insert failed: ${errorInsertError.message}`);
      }

      // Clean up test data
      await supabase
        .from('property_listing_sync_state')
        .delete()
        .eq('id', insertedSync.id);

      console.log('   ✅ Test data cleaned up\n');
    } else {
      console.log(`   ❌ Insert operation failed: ${insertError?.message}\n`);
    }

    // Check 4: Verify statistics view
    console.log('4️⃣  Checking property_listing_sync_statistics view...');
    const { error: viewError } = await supabase
      .from('property_listing_sync_statistics')
      .select('*')
      .limit(1);

    if (!viewError || viewError.code === 'PGRST116') {
      checks.statisticsView = true;
      console.log('   ✅ Statistics view exists and is accessible\n');
    } else {
      console.log(`   ⚠️  View check failed: ${viewError.message}\n`);
    }

    // Summary
    console.log('='.repeat(60));
    console.log('📊 Verification Summary');
    console.log('='.repeat(60));
    console.log(`Sync State Table:     ${checks.syncStateTable ? '✅' : '❌'}`);
    console.log(`Sync Errors Table:    ${checks.syncErrorsTable ? '✅' : '❌'}`);
    console.log(`Statistics View:      ${checks.statisticsView ? '✅' : '❌'}`);
    console.log('='.repeat(60));

    const allPassed = checks.syncStateTable && checks.syncErrorsTable && checks.statisticsView;

    if (allPassed) {
      console.log('\n✅ All verification checks passed!');
      console.log('\n🎯 Migration 082 is ready for use');
      console.log('\n📋 Next Steps:');
      console.log('   1. Implement SyncStateService');
      console.log('   2. Create sync status API routes');
      console.log('   3. Build sync status dashboard\n');
    } else {
      console.log('\n⚠️  Some verification checks failed');
      console.log('\n📝 Action Required:');
      console.log('   1. Review the failed checks above');
      console.log('   2. Run migration again if needed');
      console.log('   3. Check Supabase Dashboard for errors\n');
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    process.exit(1);
  }
}

// Run verification
verifyMigration();
