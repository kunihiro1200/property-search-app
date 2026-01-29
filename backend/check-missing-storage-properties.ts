import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// backend/.envファイルを読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkMissingStorageProperties() {
  console.log('🔍 storage_location未設定の公開中の物件を詳細確認中...\n');
  
  try {
    // 公開中の物件を取得（2026-01-14以降、storage_location未設定）
    const { data: properties, error: fetchError } = await supabase
      .from('property_listings')
      .select('*')
      .gte('created_at', '2026-01-14T00:00:00Z')
      .is('storage_location', null)
      .or(
        'atbb_status.ilike.%公開中%,' +
        'atbb_status.ilike.%公開前%,' +
        'atbb_status.ilike.%非公開（配信メールのみ）%'
      )
      .order('property_number');
    
    if (fetchError) {
      console.error('❌ エラー:', fetchError);
      return;
    }
    
    if (!properties || properties.length === 0) {
      console.log('✅ 全ての公開中の物件にstorage_locationが設定されています');
      return;
    }
    
    console.log(`✅ ${properties.length}件の公開中の物件が見つかりました\n`);
    
    // 各物件の詳細を表示
    properties.forEach((prop, index) => {
      console.log(`\n=== ${index + 1}. ${prop.property_number} ===`);
      console.log(`atbb_status: ${prop.atbb_status}`);
      console.log(`created_at: ${prop.created_at}`);
      console.log(`display_address: ${prop.display_address || '未設定'}`);
      console.log(`property_type: ${prop.property_type || '未設定'}`);
      console.log(`storage_location: ${prop.storage_location || '未設定'}`);
    });
    
    console.log('\n\n=== サマリー ===');
    console.log(`合計: ${properties.length}件`);
    console.log('\n💡 これらの物件はGoogle Driveにフォルダが存在しない可能性があります。');
    console.log('   手動でフォルダを作成するか、物件が実際に公開されているか確認してください。');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }
}

checkMissingStorageProperties().catch(console.error);
