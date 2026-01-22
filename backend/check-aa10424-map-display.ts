import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkAA10424() {
  console.log('🔍 AA10424の地図表示状況を確認\n');
  
  // 物件データを取得
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('id, property_number, atbb_status, address, display_address, latitude, longitude, google_map_url')
    .eq('property_number', 'AA10424');
  
  if (error) {
    console.error('❌ エラー:', error);
    return;
  }
  
  if (!properties || properties.length === 0) {
    console.log('❌ AA10424が見つかりません');
    return;
  }
  
  console.log(`📊 AA10424の物件数: ${properties.length}件\n`);
  
  properties.forEach((property, index) => {
    console.log(`\n物件 ${index + 1}:`);
    console.log(`  ID: ${property.id}`);
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  ATBB状態: ${property.atbb_status || '未設定'}`);
    console.log(`  住所: ${property.address || 'なし'}`);
    console.log(`  表示住所: ${property.display_address || 'なし'}`);
    console.log(`  座標: ${property.latitude && property.longitude ? `(${property.latitude}, ${property.longitude})` : '❌ なし'}`);
    console.log(`  Google Map URL: ${property.google_map_url ? '✅' : '❌'}`);
    
    // 地図表示の条件チェック
    console.log('\n  📍 地図表示条件:');
    
    // 1. ATBB状態が「公開中」か
    const isPublic = property.atbb_status === '公開中';
    console.log(`    1. ATBB状態が「公開中」: ${isPublic ? '✅' : '❌'} (現在: ${property.atbb_status || '未設定'})`);
    
    // 2. 座標があるか
    const hasCoordinates = property.latitude && property.longitude;
    console.log(`    2. 座標あり: ${hasCoordinates ? '✅' : '❌'}`);
    
    // 3. 地図表示可能か
    const canDisplayOnMap = isPublic && hasCoordinates;
    console.log(`\n  🗺️ 地図表示: ${canDisplayOnMap ? '✅ 可能' : '❌ 不可'}`);
    
    if (!canDisplayOnMap) {
      console.log('\n  ⚠️ 地図に表示されない理由:');
      if (!isPublic) {
        console.log(`    - ATBB状態が「公開中」ではない（現在: ${property.atbb_status || '未設定'}）`);
      }
      if (!hasCoordinates) {
        console.log('    - 座標データがない');
        if (property.google_map_url) {
          console.log(`      Google Map URL: ${property.google_map_url}`);
        }
        if (property.address) {
          console.log(`      住所: ${property.address}`);
        }
      }
    }
  });
  
  // 公開中の物件のみカウント
  const publicProperties = properties.filter(p => p.atbb_status === '公開中');
  const publicWithCoords = publicProperties.filter(p => p.latitude && p.longitude);
  
  console.log('\n\n📊 サマリー:');
  console.log(`  全AA10424物件: ${properties.length}件`);
  console.log(`  公開中: ${publicProperties.length}件`);
  console.log(`  公開中 & 座標あり: ${publicWithCoords.length}件`);
}

checkAA10424();
