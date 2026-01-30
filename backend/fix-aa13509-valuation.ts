/**
 * AA13509の査定額を正しい値で更新するスクリプト
 * 手動入力査定額（列79-81）を使用
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixAA13509Valuation() {
  console.log('🔧 AA13509の査定額を修正します...\n');

  // 正しい値（手動入力査定額）
  const correctValues = {
    valuation_amount_1: 3680 * 10000, // 3680万円 → 36,800,000円
    valuation_amount_2: 3980 * 10000, // 3980万円 → 39,800,000円
    valuation_amount_3: 4280 * 10000, // 4280万円 → 42,800,000円
  };

  console.log('📊 更新する値:');
  console.log(`  査定額1: ${(correctValues.valuation_amount_1 / 10000).toLocaleString()}万円`);
  console.log(`  査定額2: ${(correctValues.valuation_amount_2 / 10000).toLocaleString()}万円`);
  console.log(`  査定額3: ${(correctValues.valuation_amount_3 / 10000).toLocaleString()}万円`);

  const { error } = await supabase
    .from('sellers')
    .update(correctValues)
    .eq('seller_number', 'AA13509');

  if (error) {
    console.error('❌ 更新エラー:', error.message);
    return;
  }

  console.log('\n✅ AA13509の査定額を更新しました');

  // 確認
  const { data: updated } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .eq('seller_number', 'AA13509')
    .single();

  if (updated) {
    const val1 = updated.valuation_amount_1 ? `${(updated.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
    const val2 = updated.valuation_amount_2 ? `${(updated.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
    const val3 = updated.valuation_amount_3 ? `${(updated.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
    console.log(`\n📊 更新後の値: ${val1} / ${val2} / ${val3}`);
  }
}

fixAA13509Valuation().catch(console.error);
