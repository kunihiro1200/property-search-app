/**
 * 自動更新同期機能のテストスクリプト
 */
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testAutoUpdateSync() {
  console.log('🧪 Testing auto-update sync functionality...\n');

  try {
    const { getEnhancedAutoSyncService } = await import('./src/services/EnhancedAutoSyncService');
    const { createClient } = await import('@supabase/supabase-js');
    
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    console.log('✅ Auto-sync service initialized\n');

    // AA13231の現在の状態を確認
    console.log('📊 Step 1: Check AA13231 current state in DB');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    const { data: beforeUpdate, error: beforeError } = await supabase
      .from('sellers')
      .select('seller_number, status, contract_year_month, visit_assignee, updated_at')
      .eq('seller_number', 'AA13231')
      .single();

    if (beforeError) {
      console.error('❌ Error fetching AA13231:', beforeError.message);
      return;
    }

    console.log('   Before update:');
    console.log(`   - Status: ${beforeUpdate.status}`);
    console.log(`   - Contract Year/Month: ${beforeUpdate.contract_year_month || 'null'}`);
    console.log(`   - Visit Assignee: ${beforeUpdate.visit_assignee || 'null'}`);
    console.log(`   - Updated At: ${beforeUpdate.updated_at}`);
    console.log();

    // 更新が必要な売主を検出
    console.log('📊 Step 2: Detect updated sellers');
    const updatedSellers = await syncService.detectUpdatedSellers();
    console.log(`   Found ${updatedSellers.length} sellers to update`);
    
    const aa13231NeedsUpdate = updatedSellers.includes('AA13231');
    console.log(`   AA13231 needs update: ${aa13231NeedsUpdate ? '✅ Yes' : '❌ No'}`);
    console.log();

    if (!aa13231NeedsUpdate) {
      console.log('⚠️  AA13231 does not need update according to detection logic');
      console.log('   This might indicate that the data is already up-to-date or detection logic needs adjustment');
      return;
    }

    // 更新を実行
    console.log('📊 Step 3: Sync updated sellers');
    const updateResult = await syncService.syncUpdatedSellers(['AA13231']);
    console.log(`   Updated: ${updateResult.updatedSellersCount}`);
    console.log(`   Errors: ${updateResult.errors.length}`);
    
    if (updateResult.errors.length > 0) {
      console.log('   Errors:');
      for (const error of updateResult.errors) {
        console.log(`   - ${error.sellerNumber}: ${error.message}`);
      }
    }
    console.log();

    // 更新後の状態を確認
    console.log('📊 Step 4: Check AA13231 state after update');
    const { data: afterUpdate, error: afterError } = await supabase
      .from('sellers')
      .select('seller_number, status, contract_year_month, visit_assignee, updated_at')
      .eq('seller_number', 'AA13231')
      .single();

    if (afterError) {
      console.error('❌ Error fetching AA13231:', afterError.message);
      return;
    }

    console.log('   After update:');
    console.log(`   - Status: ${afterUpdate.status}`);
    console.log(`   - Contract Year/Month: ${afterUpdate.contract_year_month || 'null'}`);
    console.log(`   - Visit Assignee: ${afterUpdate.visit_assignee || 'null'}`);
    console.log(`   - Updated At: ${afterUpdate.updated_at}`);
    console.log();

    // 変更を確認
    console.log('📊 Step 5: Verify changes');
    const changes: string[] = [];
    
    if (beforeUpdate.status !== afterUpdate.status) {
      changes.push(`Status: ${beforeUpdate.status} → ${afterUpdate.status}`);
    }
    if (beforeUpdate.contract_year_month !== afterUpdate.contract_year_month) {
      changes.push(`Contract Year/Month: ${beforeUpdate.contract_year_month || 'null'} → ${afterUpdate.contract_year_month || 'null'}`);
    }
    if (beforeUpdate.visit_assignee !== afterUpdate.visit_assignee) {
      changes.push(`Visit Assignee: ${beforeUpdate.visit_assignee || 'null'} → ${afterUpdate.visit_assignee || 'null'}`);
    }

    if (changes.length > 0) {
      console.log('   ✅ Changes detected:');
      for (const change of changes) {
        console.log(`   - ${change}`);
      }
    } else {
      console.log('   ⚠️  No changes detected');
    }
    console.log();

    // 専任件数を確認
    console.log('📊 Step 6: Check exclusive contracts for December 2025');
    const { data: exclusiveContracts, error: exclusiveError } = await supabase
      .from('sellers')
      .select('seller_number, status, contract_year_month, visit_assignee')
      .eq('status', '専任媒介')
      .like('contract_year_month', '2025-12%')
      .eq('visit_assignee', 'Y');

    if (exclusiveError) {
      console.error('❌ Error fetching exclusive contracts:', exclusiveError.message);
    } else {
      console.log(`   Found ${exclusiveContracts?.length || 0} exclusive contracts for Y in December 2025:`);
      if (exclusiveContracts) {
        for (const contract of exclusiveContracts) {
          console.log(`   - ${contract.seller_number}: ${contract.contract_year_month}`);
        }
      }
    }

    console.log('\n🎉 Test completed!');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testAutoUpdateSync().catch(console.error);
