import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA12449() {
  console.log('=== AA12449の調査 ===\n');

  // 1. property_listingsテーブルを確認
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA12449')
    .single();

  if (propError) {
    console.error('Property取得エラー:', propError);
    return;
  }

  if (!property) {
    console.log('❌ AA12449はproperty_listingsテーブルに存在しません');
    return;
  }

  console.log('✅ AA12449が見つかりました\n');
  console.log('物件情報:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  配信エリア: ${property.distribution_areas || '(未設定)'}`);
  console.log(`  Google Map URL: ${property.google_map_url || '(なし)'}`);
  console.log('');

  // 2. 住所が別府市かチェック
  if (property.address && property.address.includes('別府市')) {
    console.log('✅ 別府市の物件です');
    
    // 3. BeppuAreaMappingServiceで配信エリアを計算してみる
    const { BeppuAreaMappingService } = await import('./src/services/BeppuAreaMappingService');
    const beppuService = new BeppuAreaMappingService();
    
    try {
      const calculatedAreas = await beppuService.getDistributionAreasForAddress(property.address);
      console.log(`\n計算された配信エリア: ${calculatedAreas || '(マッピングなし)'}`);
      
      if (!calculatedAreas) {
        console.log('\n⚠️ この住所に対するマッピングが見つかりません');
        console.log('住所を詳しく確認:');
        console.log(`  完全な住所: ${property.address}`);
        
        // 住所から地域名を抽出してみる
        const addressParts = property.address.split('別府市');
        if (addressParts.length > 1) {
          const afterBeppu = addressParts[1].trim();
          console.log(`  別府市の後: ${afterBeppu}`);
          
          // 丁目や番地を除いた地域名
          const regionMatch = afterBeppu.match(/^([^\d]+)/);
          if (regionMatch) {
            console.log(`  地域名（推定）: ${regionMatch[1]}`);
          }
        }
      } else {
        console.log('\n✅ 配信エリアの計算は成功しました');
        console.log(`現在のDB値: ${property.distribution_areas || '(未設定)'}`);
        console.log(`計算された値: ${calculatedAreas}`);
        
        if (property.distribution_areas !== calculatedAreas) {
          console.log('\n⚠️ DBの値と計算値が異なります。更新が必要です。');
        }
      }
    } catch (error) {
      console.error('\n❌ 配信エリア計算エラー:', error);
    }
  } else {
    console.log('❌ 別府市の物件ではありません');
    console.log(`住所: ${property.address}`);
  }

  // 4. beppu_area_mappingテーブルで類似する地域を検索
  if (property.address && property.address.includes('別府市')) {
    console.log('\n=== 類似する地域マッピングを検索 ===');
    const { data: mappings } = await supabase
      .from('beppu_area_mapping')
      .select('region_name, distribution_areas')
      .order('region_name');

    if (mappings) {
      const addressParts = property.address.split('別府市');
      if (addressParts.length > 1) {
        const afterBeppu = addressParts[1].trim();
        const regionMatch = afterBeppu.match(/^([^\d]+)/);
        
        if (regionMatch) {
          const searchTerm = regionMatch[1].trim();
          console.log(`検索キーワード: "${searchTerm}"`);
          
          const similar = mappings.filter(m => 
            m.region_name.includes(searchTerm) || searchTerm.includes(m.region_name)
          );
          
          if (similar.length > 0) {
            console.log(`\n類似するマッピング (${similar.length}件):`);
            similar.forEach(m => {
              console.log(`  ${m.region_name}: ${m.distribution_areas}`);
            });
          } else {
            console.log('\n類似するマッピングが見つかりません');
          }
        }
      }
    }
  }
}

checkAA12449()
  .then(() => {
    console.log('\n調査完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
