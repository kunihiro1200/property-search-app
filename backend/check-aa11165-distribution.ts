import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA11165Distribution() {
  console.log('=== AA11165 配信エリア調査 ===\n');

  // 1. property_listingsテーブルから物件情報を取得
  const { data: property, error: propError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA11165')
    .single();

  if (propError) {
    console.error('物件取得エラー:', propError);
    return;
  }

  if (!property) {
    console.log('AA11165が見つかりません');
    return;
  }

  console.log('物件情報:');
  console.log('物件番号:', property.property_number);
  console.log('住所:', property.address);
  console.log('配信エリア (distribution_areas):', property.distribution_areas);
  console.log('\n');

  // 2. 住所から地域を抽出
  const address = property.address || '';
  console.log('住所解析:');
  console.log('完全な住所:', address);
  
  // 扇山を含むかチェック
  if (address.includes('扇山')) {
    console.log('✓ 住所に「扇山」が含まれています');
  } else {
    console.log('✗ 住所に「扇山」が含まれていません');
  }

  console.log('\n');

  // 3. beppu_area_mappingテーブルで扇山のマッピングを確認
  const { data: mappings, error: mapError } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .ilike('address_pattern', '%扇山%')
    .order('address_pattern');

  console.log('=== 扇山のエリアマッピング ===');
  if (mapError) {
    console.error('マッピング取得エラー:', mapError);
  } else if (mappings && mappings.length > 0) {
    mappings.forEach(m => {
      console.log(`パターン: ${m.address_pattern} → エリア: ${m.area_numbers}`);
    });
  } else {
    console.log('扇山のマッピングが見つかりません');
  }

  console.log('\n');

  // 4. 期待されるエリア番号を確認
  console.log('=== 期待される配信エリア ===');
  console.log('扇山は㊶と⑨のエリアに該当するはずです');
  console.log('現在の配信エリア:', property.distribution_areas);
  
  if (property.distribution_areas) {
    const areas = property.distribution_areas;
    const has36 = areas.includes('36') || areas.includes('㊶');
    const has9 = areas.includes('9') || areas.includes('⑨');
    
    console.log('㊶(36)が含まれているか:', has36);
    console.log('⑨(9)が含まれているか:', has9);
    
    if (has36 && !has9) {
      console.log('\n⚠️ 問題: ㊶のみで⑨が欠けています');
    } else if (!has36 && !has9) {
      console.log('\n⚠️ 問題: 両方のエリアが欠けています');
    } else if (has36 && has9) {
      console.log('\n✓ 両方のエリアが正しく設定されています');
    }
  } else {
    console.log('\n⚠️ 配信エリアが設定されていません');
  }

  console.log('\n');

  // 5. PropertyDistributionAreaCalculatorのロジックをシミュレート
  console.log('=== エリア計算ロジックの確認 ===');
  
  // 別府市の住所パターンをチェック
  const isBeppu = address.includes('別府市');
  console.log('別府市の住所か:', isBeppu);
  
  if (isBeppu) {
    // 扇山のパターンマッチング
    const ougiyamaPattern = /扇山/;
    if (ougiyamaPattern.test(address)) {
      console.log('✓ 扇山パターンにマッチします');
      console.log('期待される動作: beppu_area_mappingから該当エリアを取得');
    }
  }
}

checkAA11165Distribution().catch(console.error);
