/**
 * 削除同期のテストスクリプト
 * 
 * Phase 3: Seller Deletion Sync の動作確認を行います
 */
import { getEnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';

async function testDeletionSync() {
  console.log('🧪 Testing Phase 3: Seller Deletion Sync...\n');
  
  try {
    const syncService = getEnhancedAutoSyncService();
    await syncService.initialize();
    
    console.log('✅ EnhancedAutoSyncService initialized\n');
    
    // 1. 削除された売主を検出
    console.log('1️⃣  Detecting deleted sellers...');
    const deletedSellers = await syncService.detectDeletedSellers();
    console.log(`🗑️  Detected ${deletedSellers.length} deleted sellers`);
    
    if (deletedSellers.length > 0) {
      console.log(`   First 10: ${deletedSellers.slice(0, 10).join(', ')}`);
      
      if (deletedSellers.length > 10) {
        console.log(`   ... and ${deletedSellers.length - 10} more`);
      }
      
      console.log('\n⚠️  Deletion sync is available but not executed in this test.');
      console.log('   To execute deletion sync, run:');
      console.log('   ```typescript');
      console.log('   const result = await syncService.syncDeletedSellers(deletedSellers);');
      console.log('   console.log(result);');
      console.log('   ```');
      
      console.log('\n📋 What will happen when you execute deletion sync:');
      console.log('   1. Validate each seller (check for active contracts, recent activity)');
      console.log('   2. Create audit log in seller_deletion_audit table');
      console.log('   3. Set deleted_at timestamp on sellers table');
      console.log('   4. Cascade delete to properties table');
      console.log('   5. Return detailed results');
      
      console.log('\n🔧 Configuration:');
      console.log(`   - DELETION_SYNC_ENABLED: ${process.env.DELETION_SYNC_ENABLED || 'true (default)'}`);
      console.log(`   - DELETION_VALIDATION_STRICT: ${process.env.DELETION_VALIDATION_STRICT || 'true (default)'}`);
      console.log(`   - DELETION_RECENT_ACTIVITY_DAYS: ${process.env.DELETION_RECENT_ACTIVITY_DAYS || '7 (default)'}`);
      console.log(`   - DELETION_MAX_PER_SYNC: ${process.env.DELETION_MAX_PER_SYNC || '100 (default)'}`);
      
    } else {
      console.log('✅ No deleted sellers to sync');
      console.log('   This means all sellers in the database are also in the spreadsheet.');
    }
    
    // 2. アクティブな売主の数を確認
    console.log('\n2️⃣  Checking active sellers...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { count: activeCount } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    console.log(`📊 Active sellers in database: ${activeCount || 0}`);
    
    // 3. 削除済み売主の数を確認
    console.log('\n3️⃣  Checking already deleted sellers...');
    const { count: deletedCount } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);
    
    console.log(`📊 Already deleted sellers: ${deletedCount || 0}`);
    
    if (deletedCount && deletedCount > 0) {
      // 最近削除された売主を表示
      const { data: recentlyDeleted } = await supabase
        .from('sellers')
        .select('seller_number, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(5);
      
      if (recentlyDeleted && recentlyDeleted.length > 0) {
        console.log('\n   Recently deleted sellers:');
        for (const seller of recentlyDeleted) {
          const deletedDate = new Date(seller.deleted_at).toLocaleString('ja-JP');
          console.log(`   - ${seller.seller_number} (deleted: ${deletedDate})`);
        }
      }
    }
    
    // 4. 監査ログの確認
    console.log('\n4️⃣  Checking deletion audit logs...');
    const { count: auditCount } = await supabase
      .from('seller_deletion_audit')
      .select('*', { count: 'exact', head: true });
    
    console.log(`📊 Audit records: ${auditCount || 0}`);
    
    if (auditCount && auditCount > 0) {
      const { data: recentAudits } = await supabase
        .from('seller_deletion_audit')
        .select('seller_number, deleted_at, deleted_by, can_recover')
        .order('deleted_at', { ascending: false })
        .limit(5);
      
      if (recentAudits && recentAudits.length > 0) {
        console.log('\n   Recent audit logs:');
        for (const audit of recentAudits) {
          const deletedDate = new Date(audit.deleted_at).toLocaleString('ja-JP');
          const recoverable = audit.can_recover ? '✅ Recoverable' : '❌ Not recoverable';
          console.log(`   - ${audit.seller_number} (${deletedDate}, by: ${audit.deleted_by}, ${recoverable})`);
        }
      }
    }
    
    console.log('\n✅ Test completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Review the detected deleted sellers above');
    console.log('   2. If you want to execute deletion sync, modify this script');
    console.log('   3. Or run full sync: await syncService.runFullSync("manual")');
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 実行
testDeletionSync()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
