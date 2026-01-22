import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function recalculateAA12766Areas() {
  console.log('=== AA12766 配信エリア再計算 ===\n');

  try {
    // 1. 物件情報を取得
    const { data: property, error: propError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA12766')
      .single();

    if (propError || !property) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    console.log('【物件情報】');
    console.log(`物件番号: ${property.property_number}`);
    console.log(`住所: ${property.address}`);
    console.log(`現在の配信エリア: ${property.distribution_areas}`);

    // 2. 配信エリアを再計算
    console.log('\n【配信エリア再計算】');
    const calculator = new PropertyDistributionAreaCalculator(supabase);
    const result = await calculator.calculateDistributionAreas(property);

    console.log(`計算結果: ${result.areas}`);
    console.log(`計算方法: ${result.method}`);

    // 3. データベースを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        distribution_areas: result.areas,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'AA12766');

    if (updateError) {
      console.error('❌ 更新失敗:', updateError.message);
      return;
    }

    console.log('\n✅ 配信エリア更新完了');
    console.log(`${property.distribution_areas} → ${result.areas}`);

    // 4. 期待値との比較
    const expected = '⑩⑭㊶㊸';
    console.log('\n【期待値との比較】');
    console.log(`期待値: ${expected}`);
    console.log(`実際の値: ${result.areas}`);
    
    if (result.areas === expected) {
      console.log('✅ 期待値と一致しました！');
    } else {
      console.log('⚠️ 期待値と異なります');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

recalculateAA12766Areas()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
