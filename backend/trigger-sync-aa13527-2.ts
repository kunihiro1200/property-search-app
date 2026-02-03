import { EnhancedAutoSyncService } from './src/services/EnhancedAutoSyncService';
import * as dotenv from 'dotenv';

dotenv.config();

async function triggerSync() {
  console.log('🔄 手動同期を実行してAA13527-2を追加...\n');

  try {
    const syncService = new EnhancedAutoSyncService(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await syncService.initialize();

    console.log('📥 Phase 4.6: 新規物件追加同期を実行...');
    const result = await syncService.syncNewPropertyAddition();

    console.log('\n📊 結果:');
    console.log('   - 追加: ', result.added, '件');
    console.log('   - 失敗: ', result.failed, '件');
    console.log('   - 成功: ', result.success ? 'はい' : 'いいえ');

    // AA13527-2が追加されたか確認
    console.log('\n🔍 AA13527-2が追加されたか確認...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA13527-2');

    if (error) {
      console.log('❌ エラー:', error.message);
    } else if (!data || data.length === 0) {
      console.log('❌ まだproperty_listingsに存在しません');
    } else {
      console.log(`✅ property_listingsに${data.length}件追加されました！`);
      data.forEach((item, index) => {
        console.log(`\n[${index + 1}]:`);
        console.log('   - id:', item.id);
        console.log('   - property_number:', item.property_number);
        console.log('   - atbb_status:', item.atbb_status);
        console.log('   - created_at:', item.created_at);
      });
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

triggerSync();
