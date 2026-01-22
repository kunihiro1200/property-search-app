import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseAA12449() {
  console.log('=== AA12449の配信エリア診断 ===\n');

  // 1. 物件情報を取得
  const { data: property, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA12449')
    .single();

  if (error || !property) {
    console.error('物件が見つかりません:', error);
    return;
  }

  console.log('物件情報:');
  console.log(`  物件番号: ${property.property_number}`);
  console.log(`  住所: ${property.address}`);
  console.log(`  現在の配信エリア: ${property.distribution_areas || '(未設定)'}`);
  console.log('');

  // 2. PropertyDistributionAreaCalculatorで配信エリアを計算
  const calculator = new PropertyDistributionAreaCalculator();
  
  try {
    const result = await calculator.calculateDistributionAreas(
      property.google_map_url,
      '大分市',  // 市名を明示的に渡す
      property.address
    );
    
    console.log('計算結果:');
    console.log(`  エリア配列: [${result.areas.join(', ')}]`);
    console.log(`  フォーマット済み: ${result.formatted}`);
    console.log(`  半径マッチ: [${result.radiusAreas.join(', ')}]`);
    console.log(`  市全域マッチ: [${result.cityWideAreas.join(', ')}]`);
    console.log('');

    if (result.formatted) {
      console.log('✅ 配信エリアの計算に成功しました');
      
      if (property.distribution_areas !== result.formatted) {
        console.log('\n⚠️ DBの値と計算値が異なります');
        console.log(`  DB: ${property.distribution_areas || '(未設定)'}`);
        console.log(`  計算値: ${result.formatted}`);
        console.log('更新が必要です');
      } else {
        console.log('DBの値は正しいです');
      }
    } else {
      console.log('❌ 配信エリアを計算できませんでした');
      console.log('\n考えられる原因:');
      console.log('1. 住所が不完全または不正確');
      console.log('2. area_map_configテーブルにマッピングがない');
      console.log('3. 住所の形式が想定外');
    }
  } catch (error: any) {
    console.error('❌ 計算エラー:', error.message);
    console.error('スタックトレース:', error.stack);
  }

  // 3. area_map_configで類似する地域を検索
  console.log('\n=== area_map_configテーブルを確認 ===');
  const { data: areaConfigs } = await supabase
    .from('area_map_config')
    .select('*')
    .ilike('address_pattern', '%中津留%');

  if (areaConfigs && areaConfigs.length > 0) {
    console.log(`中津留に関するマッピング (${areaConfigs.length}件):`);
    areaConfigs.forEach(config => {
      console.log(`  ${config.address_pattern}: エリア${config.area_number}`);
    });
  } else {
    console.log('中津留に関するマッピングが見つかりません');
    
    // 大分市全体を検索
    const { data: oitaConfigs } = await supabase
      .from('area_map_config')
      .select('*')
      .ilike('address_pattern', '%大分市%')
      .limit(10);

    if (oitaConfigs && oitaConfigs.length > 0) {
      console.log(`\n大分市のマッピング例 (最初の10件):`);
      oitaConfigs.forEach(config => {
        console.log(`  ${config.address_pattern}: エリア${config.area_number}`);
      });
    }
  }
}

diagnoseAA12449()
  .then(() => {
    console.log('\n診断完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
