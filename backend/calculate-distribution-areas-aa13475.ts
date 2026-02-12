// 物件AA13475の配信エリアを計算・設定するスクリプト
import { createClient } from '@supabase/supabase-js';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function calculateAndSetDistributionAreas() {
  const propertyNumber = 'AA13475';
  
  console.log('='.repeat(80));
  console.log(`物件AA13475の配信エリアを計算・設定`);
  console.log('='.repeat(80));
  console.log();
  
  // 1. 物件データを取得
  console.log('1. 物件データを取得:');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, distribution_areas')
    .eq('property_number', propertyNumber)
    .single();
  
  if (propertyError || !property) {
    console.log(`  ❌ 物件が見つかりません: ${propertyError?.message}`);
    return;
  }
  
  console.log(`  ✅ 物件が見つかりました`);
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  Google Map URL: ${property.google_map_url}`);
  console.log(`  現在の配信エリア: ${property.distribution_areas || '(未設定)'}`);
  console.log();
  
  // 2. 売主データから市を取得
  console.log('2. 売主データから市を取得:');
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('seller_number, city')
    .eq('seller_number', propertyNumber)
    .single();
  
  if (sellerError || !seller) {
    console.log(`  ❌ 売主データが見つかりません: ${sellerError?.message}`);
    return;
  }
  
  console.log(`  ✅ 売主データが見つかりました`);
  console.log(`  市: ${seller.city || '(未設定)'}`);
  console.log();
  
  // 3. 配信エリアを計算
  console.log('3. 配信エリアを計算:');
  const calculator = new PropertyDistributionAreaCalculator();
  
  try {
    const { result, debugInfo } = await calculator.calculateWithDebugInfo(
      property.google_map_url,
      seller.city
    );
    
    console.log(`  ✅ 配信エリアを計算しました`);
    console.log(`  計算方法: ${result.method}`);
    console.log(`  配信エリア: ${result.areas.join(', ')}`);
    console.log();
    
    if (debugInfo) {
      console.log('  デバッグ情報:');
      console.log(`    物件座標: ${debugInfo.propertyCoordinates ? `(${debugInfo.propertyCoordinates.lat}, ${debugInfo.propertyCoordinates.lng})` : '(取得失敗)'}`);
      console.log(`    市: ${debugInfo.city || '(未設定)'}`);
      console.log(`    距離計算結果:`);
      if (debugInfo.distanceCalculations && debugInfo.distanceCalculations.length > 0) {
        debugInfo.distanceCalculations.forEach(calc => {
          console.log(`      - エリア${calc.areaNumber}: ${calc.distance.toFixed(2)}km ${calc.withinRadius ? '✅' : '❌'}`);
        });
      } else {
        console.log(`      (距離計算なし)`);
      }
      console.log();
    }
    
    // 4. 配信エリアを設定
    if (result.areas.length === 0) {
      console.log('  ⚠️ 配信エリアが0件です。設定をスキップします。');
      return;
    }
    
    console.log('4. 配信エリアを設定:');
    const { data: updatedProperty, error: updateError } = await supabase
      .from('property_listings')
      .update({
        distribution_areas: result.areas.join('')
      })
      .eq('property_number', propertyNumber)
      .select()
      .single();
    
    if (updateError) {
      console.log(`  ❌ 更新に失敗しました: ${updateError.message}`);
      return;
    }
    
    console.log(`  ✅ 配信エリアを設定しました`);
    console.log(`  更新後の配信エリア: ${updatedProperty.distribution_areas}`);
    console.log();
    
  } catch (error: any) {
    console.log(`  ❌ 配信エリアの計算に失敗しました: ${error.message}`);
    console.log();
  }
  
  console.log('='.repeat(80));
}

calculateAndSetDistributionAreas()
  .then(() => {
    console.log('完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  });
