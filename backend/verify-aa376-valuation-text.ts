/**
 * AA376のvaluation_textがデータベースに正しく保存されているか確認
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  console.log('=== AA376 valuation_text 確認 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('sellers')
    .select('seller_number, valuation_text, valuation_amount_1, valuation_amount_2, valuation_amount_3, fixed_asset_tax_road_price')
    .eq('seller_number', 'AA376')
    .single();

  if (error) {
    console.log(`❌ エラー: ${error.message}`);
    return;
  }

  console.log('📊 AA376のデータベース状態:');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n📋 表示ロジック判定:');
  console.log(`  valuation_amount_1: ${data.valuation_amount_1 || 'なし'}`);
  console.log(`  valuation_text: ${data.valuation_text || 'なし'}`);
  
  if (data.valuation_amount_1) {
    console.log('\n  → 数値査定額が表示されます');
  } else if (data.valuation_text) {
    console.log('\n  → テキスト査定額「' + data.valuation_text + '」が表示されます');
  } else {
    console.log('\n  → 「査定額未設定」が表示されます');
  }
}

main().catch(console.error);
