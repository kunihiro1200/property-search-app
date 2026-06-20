/**
 * 査定額のDB状態を確認するスクリプト（スプレッドシートAPIを使用しない）
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkValuationDbOnly() {
  console.log('🔍 査定額のDB状態を確認します...\n');

  // 査定方法はあるが査定額がない売主を確認
  console.log('📋 査定方法はあるが査定額がない売主を確認...');
  
  const { data: sellersWithoutValuation, error: error1 } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .is('valuation_amount_1', null)
    .not('valuation_method', 'is', null)
    .limit(20);
  
  if (error1) {
    console.error('❌ エラー:', error1.message);
    return;
  }
  
  if (sellersWithoutValuation && sellersWithoutValuation.length > 0) {
    console.log(`\n⚠️ 査定方法はあるが査定額がない売主: ${sellersWithoutValuation.length}件`);
    sellersWithoutValuation.forEach(s => {
      console.log(`  ${s.seller_number}: 査定方法="${s.valuation_method}", 査定額1=${s.valuation_amount_1 || '(空)'}`);
    });
  } else {
    console.log('✅ 査定方法があって査定額がない売主はいません');
  }
  
  // 査定額がある売主のサンプルを確認
  console.log('\n📋 査定額がある売主のサンプル...');
  
  const { data: sellersWithValuation, error: error2 } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .not('valuation_amount_1', 'is', null)
    .limit(10);
  
  if (error2) {
    console.error('❌ エラー:', error2.message);
    return;
  }
  
  if (sellersWithValuation && sellersWithValuation.length > 0) {
    console.log(`\n✅ 査定額がある売主: ${sellersWithValuation.length}件`);
    sellersWithValuation.forEach(s => {
      const val1 = s.valuation_amount_1 ? `${(s.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
      const val2 = s.valuation_amount_2 ? `${(s.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
      const val3 = s.valuation_amount_3 ? `${(s.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
      console.log(`  ${s.seller_number}: ${val1} / ${val2} / ${val3} (査定方法: ${s.valuation_method || '(空)'})`);
    });
  }
  
  // AA13508を確認
  console.log('\n📋 AA13508の査定額を確認...');
  
  const { data: aa13508, error: error3 } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .eq('seller_number', 'AA13508')
    .single();
  
  if (error3) {
    console.error('❌ エラー:', error3.message);
  } else if (aa13508) {
    const val1 = aa13508.valuation_amount_1 ? `${(aa13508.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
    const val2 = aa13508.valuation_amount_2 ? `${(aa13508.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
    const val3 = aa13508.valuation_amount_3 ? `${(aa13508.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
    console.log(`  AA13508: ${val1} / ${val2} / ${val3} (査定方法: ${aa13508.valuation_method || '(空)'})`);
  }
  
  // 統計
  console.log('\n📊 統計...');
  
  const { count: totalCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true });
  
  const { count: withValuationCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('valuation_amount_1', 'is', null);
  
  const { count: withMethodCount } = await supabase
    .from('sellers')
    .select('*', { count: 'exact', head: true })
    .not('valuation_method', 'is', null);
  
  console.log(`  総売主数: ${totalCount}`);
  console.log(`  査定額がある売主: ${withValuationCount}`);
  console.log(`  査定方法がある売主: ${withMethodCount}`);
}

checkValuationDbOnly().catch(console.error);
