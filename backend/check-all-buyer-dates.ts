/**
 * すべての買主の受付日を確認し、2026年以降の日付を検出するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: 'backend/.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAllBuyerDates() {
  console.log('🔍 すべての買主の受付日を確認中...\n');

  try {
    // 2026年以降の受付日を持つ買主を検索
    const { data: buyers, error } = await supabase
      .from('buyers')
      .select('buyer_number, name, reception_date')
      .gte('reception_date', '2026-01-01')
      .order('reception_date', { ascending: false });

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!buyers || buyers.length === 0) {
      console.log('✅ 2026年以降の受付日を持つ買主は見つかりませんでした');
      return;
    }

    console.log(`⚠️  2026年以降の受付日を持つ買主: ${buyers.length}件\n`);
    console.log('--- 上位20件 ---');
    buyers.slice(0, 20).forEach((buyer, index) => {
      const receptionDate = buyer.reception_date 
        ? new Date(buyer.reception_date).toLocaleDateString('ja-JP')
        : '未設定';
      console.log(`   ${index + 1}. ${buyer.buyer_number} - ${buyer.name} (受付日: ${receptionDate})`);
    });
    console.log('');

    if (buyers.length > 20) {
      console.log(`   ... 他 ${buyers.length - 20}件\n`);
    }

    // 2026年の買主数を集計
    const buyers2026 = buyers.filter(b => {
      const year = new Date(b.reception_date).getFullYear();
      return year === 2026;
    });

    // 2027年以降の買主数を集計
    const buyers2027Plus = buyers.filter(b => {
      const year = new Date(b.reception_date).getFullYear();
      return year >= 2027;
    });

    console.log('--- 年別集計 ---');
    console.log(`   2026年: ${buyers2026.length}件`);
    console.log(`   2027年以降: ${buyers2027Plus.length}件`);
    console.log('');

    console.log('💡 これらの買主は、受付日が2年ずれている可能性があります');
    console.log('   （2026年 → 2024年、2027年 → 2025年）');
    console.log('');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }

  console.log('🎉 確認完了');
}

checkAllBuyerDates().catch(console.error);
