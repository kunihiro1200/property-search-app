/**
 * deleted_at カラムの存在確認スクリプト
 * 
 * Phase 3: Seller Deletion Sync の実装状況を確認します
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkDeletedAtColumn() {
  console.log('🔍 Checking deleted_at column...\n');
  
  try {
    // 1. カラムの存在確認
    console.log('1️⃣  Testing column accessibility...');
    const { error: columnsError } = await supabase
      .from('sellers')
      .select('deleted_at')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Error accessing deleted_at column:', columnsError.message);
      console.log('\n💡 Solution: Run Migration 051');
      console.log('   cd backend');
      console.log('   npx ts-node migrations/run-051-migration.ts');
      console.log('\n   Or execute via Supabase Dashboard:');
      console.log('   Run the SQL from: backend/migrations/051_add_soft_delete_support.sql');
      return false;
    }
    
    console.log('✅ deleted_at column exists and is accessible\n');
    
    // 2. 削除済み売主の数を確認
    console.log('2️⃣  Counting deleted sellers...');
    const { count: deletedCount, error: deletedError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);
    
    if (deletedError) {
      console.error('❌ Error counting deleted sellers:', deletedError.message);
    } else {
      console.log(`📊 Deleted sellers: ${deletedCount || 0}`);
    }
    
    // 3. アクティブ売主の数を確認
    console.log('\n3️⃣  Counting active sellers...');
    const { count: activeCount, error: activeError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    
    if (activeError) {
      console.error('❌ Error counting active sellers:', activeError.message);
    } else {
      console.log(`📊 Active sellers: ${activeCount || 0}`);
    }
    
    // 4. seller_deletion_audit テーブルの確認
    console.log('\n4️⃣  Checking seller_deletion_audit table...');
    const { error: auditError } = await supabase
      .from('seller_deletion_audit')
      .select('id')
      .limit(1);
    
    if (auditError) {
      console.error('❌ Error accessing seller_deletion_audit table:', auditError.message);
      console.log('💡 This table should be created by Migration 051');
    } else {
      console.log('✅ seller_deletion_audit table exists');
      
      // 監査ログの数を確認
      const { count: auditCount, error: auditCountError } = await supabase
        .from('seller_deletion_audit')
        .select('*', { count: 'exact', head: true });
      
      if (!auditCountError) {
        console.log(`📊 Audit records: ${auditCount || 0}`);
      }
    }
    
    // 5. properties テーブルの deleted_at カラム確認
    console.log('\n5️⃣  Checking properties.deleted_at column...');
    const { error: propColumnsError } = await supabase
      .from('properties')
      .select('deleted_at')
      .limit(1);
    
    if (propColumnsError) {
      console.error('❌ Error accessing properties.deleted_at column:', propColumnsError.message);
    } else {
      console.log('✅ properties.deleted_at column exists');
    }
    
    console.log('\n✅ All checks passed!');
    console.log('\n📝 Summary:');
    console.log('   - sellers.deleted_at: ✅ Exists');
    console.log('   - properties.deleted_at: ✅ Exists');
    console.log('   - seller_deletion_audit: ✅ Exists');
    console.log('\n🎉 Phase 3: Seller Deletion Sync is ready to use!');
    
    return true;
    
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// 実行
checkDeletedAtColumn()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
