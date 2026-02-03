import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import * as dotenv from 'dotenv';

dotenv.config();

async function syncAA13527_2() {
  console.log('🔄 AA13527-2を手動で同期中...\n');

  try {
    const syncService = new PropertyListingSyncService();
    
    // 新規物件追加同期を実行
    console.log('📥 新規物件追加同期を実行...');
    await syncService.syncNewProperties();
    
    console.log('\n✅ 同期完了');
    
    // 同期後の状態を確認
    console.log('\n🔍 同期後の状態を確認...');
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
      console.log(`✅ property_listingsに${data.length}件追加されました`);
      data.forEach((item, index) => {
        console.log(`\n[${index + 1}]:`);
        console.log('   - id:', item.id);
        console.log('   - property_number:', item.property_number);
        console.log('   - atbb_status:', item.atbb_status);
        console.log('   - storage_location:', item.storage_location || 'NULL');
      });
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

syncAA13527_2();
