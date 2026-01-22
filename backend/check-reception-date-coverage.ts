// 受付日カバレッジ確認スクリプト
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 受付日カバレッジ確認 ===\n');

  try {
    // 全買主数を取得
    const { count: totalCount, error: totalError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('❌ エラー:', totalError.message);
      process.exit(1);
    }

    // 受付日が設定されている買主数を取得
    const { count: withReceptionDate, error: withError } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true })
      .not('reception_date', 'is', null);

    if (withError) {
      console.error('❌ エラー:', withError.message);
      process.exit(1);
    }

    // 受付日が未設定の買主数
    const withoutReceptionDate = (totalCount || 0) - (withReceptionDate || 0);
    const coverage = totalCount ? ((withReceptionDate || 0) / totalCount * 100).toFixed(1) : 0;

    console.log('📊 統計情報\n');
    console.log(`全買主数: ${totalCount}件`);
    console.log(`受付日あり: ${withReceptionDate}件`);
    console.log(`受付日なし: ${withoutReceptionDate}件`);
    console.log(`カバレッジ: ${coverage}%`);
    console.log('');

    // 最近の買主10件をサンプル表示
    const { data: recentBuyers, error: recentError } = await supabase
      .from('buyers')
      .select('buyer_number, name, reception_date')
      .order('db_created_at', { ascending: false })
      .limit(10);

    if (recentError) {
      console.error('❌ エラー:', recentError.message);
      process.exit(1);
    }

    console.log('📋 最近の買主10件（サンプル）\n');
    console.log('買主番号 | 氏名 | 受付日');
    console.log('---------|------|--------');
    
    recentBuyers?.forEach(buyer => {
      const receptionDate = buyer.reception_date 
        ? new Date(buyer.reception_date).toLocaleDateString('ja-JP')
        : '未設定';
      const name = (buyer.name || '(未設定)').substring(0, 10);
      console.log(`${buyer.buyer_number} | ${name} | ${receptionDate}`);
    });

    console.log('');

    if (withoutReceptionDate > 0) {
      console.log('⚠️ 受付日が未設定の買主が存在します。');
      console.log('');
      console.log('次のステップ:');
      console.log('1. スプレッドシートに受付日データがあるか確認');
      console.log('2. 全買主データを再同期: npx ts-node sync-buyers.ts');
    } else {
      console.log('✅ 全ての買主に受付日が設定されています！');
      console.log('');
      console.log('次のステップ:');
      console.log('1. ブラウザで確認: http://localhost:5173/buyers');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
