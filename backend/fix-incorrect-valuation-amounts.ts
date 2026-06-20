/**
 * 間違った査定額を修正するスクリプト
 * CB, CC, CD列（手動入力）の値を使用
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixIncorrectValuationAmounts() {
  console.log('🔧 間違った査定額を修正します...\n');

  // 修正対象（CB, CC, CD列の手動入力値を使用）
  const corrections = [
    {
      seller_number: 'AA13505',
      valuation_amount_1: 3780 * 10000, // 3780万円
      valuation_amount_2: 4080 * 10000, // 4080万円
      valuation_amount_3: 4380 * 10000, // 4380万円
    },
    {
      seller_number: 'AA13510',
      valuation_amount_1: 1180 * 10000, // 1180万円
      valuation_amount_2: 1280 * 10000, // 1280万円
      valuation_amount_3: 1580 * 10000, // 1580万円
    },
    {
      seller_number: 'AA13498',
      valuation_amount_1: 2000 * 10000, // 2000万円
      valuation_amount_2: 2200 * 10000, // 2200万円
      valuation_amount_3: 2400 * 10000, // 2400万円
    },
  ];

  for (const correction of corrections) {
    console.log(`📝 ${correction.seller_number}を修正中...`);
    console.log(`   新しい値: ${correction.valuation_amount_1 / 10000}万円 / ${correction.valuation_amount_2 / 10000}万円 / ${correction.valuation_amount_3 / 10000}万円`);

    const { error } = await supabase
      .from('sellers')
      .update({
        valuation_amount_1: correction.valuation_amount_1,
        valuation_amount_2: correction.valuation_amount_2,
        valuation_amount_3: correction.valuation_amount_3,
      })
      .eq('seller_number', correction.seller_number);

    if (error) {
      console.error(`   ❌ エラー: ${error.message}`);
    } else {
      console.log(`   ✅ 修正完了`);
    }
  }

  // 確認
  console.log('\n📊 修正後の確認:');
  const { data: updated } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .in('seller_number', corrections.map(c => c.seller_number));

  updated?.forEach(seller => {
    const val1 = seller.valuation_amount_1 ? `${(seller.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
    const val2 = seller.valuation_amount_2 ? `${(seller.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
    const val3 = seller.valuation_amount_3 ? `${(seller.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
    console.log(`  ${seller.seller_number}: ${val1} / ${val2} / ${val3}`);
  });

  console.log('\n✅ 全ての修正が完了しました');
}

fixIncorrectValuationAmounts().catch(console.error);
