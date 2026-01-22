// 買主番号の重複をチェック
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function checkDuplicates() {
  console.log('=== 買主番号の重複チェック ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    // 現在のレコード数を確認
    const { count: totalCount, error: countError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ レコード数の取得エラー:', countError);
      return;
    }

    console.log(`総レコード数: ${totalCount}件\n`);

    // 買主番号の重複をチェック
    const { data: buyers, error } = await supabase
      .from('buyers')
      .select('buyer_number, buyer_id, created_at')
      .not('buyer_number', 'is', null)
      .neq('buyer_number', '')
      .order('buyer_number');

    if (error) {
      console.error('❌ データ取得エラー:', error);
      return;
    }

    if (!buyers || buyers.length === 0) {
      console.log('買主データが見つかりません');
      return;
    }

    console.log(`買主番号を持つレコード: ${buyers.length}件\n`);

    // 重複をカウント
    const buyerNumberMap = new Map<string, any[]>();
    
    for (const buyer of buyers) {
      const number = buyer.buyer_number;
      if (!buyerNumberMap.has(number)) {
        buyerNumberMap.set(number, []);
      }
      buyerNumberMap.get(number)!.push(buyer);
    }

    const duplicates = Array.from(buyerNumberMap.entries())
      .filter(([_, records]) => records.length > 1);

    if (duplicates.length === 0) {
      console.log('✅ 重複する買主番号は見つかりませんでした');
      console.log('\nユニーク制約を安全に追加できます。');
    } else {
      console.log(`⚠️ 重複する買主番号が ${duplicates.length} 件見つかりました:\n`);
      
      for (const [buyerNumber, records] of duplicates.slice(0, 10)) {
        console.log(`買主番号: ${buyerNumber} (${records.length}件)`);
        for (const record of records) {
          console.log(`  - ID: ${record.buyer_id}, 作成日時: ${record.created_at}`);
        }
        console.log('');
      }

      if (duplicates.length > 10) {
        console.log(`... 他 ${duplicates.length - 10} 件の重複\n`);
      }

      console.log('⚠️ マイグレーションを実行すると、最新のレコード以外は削除されます。');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkDuplicates();
