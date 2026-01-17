// 買主6647の受付日確認スクリプト
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 買主6647の受付日確認 ===\n');

  try {
    // データベースから買主6647を取得
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, name, reception_date, db_created_at, db_updated_at')
      .eq('buyer_number', '6647')
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      process.exit(1);
    }

    if (!data) {
      console.log('❌ 買主番号6647が見つかりませんでした。');
      console.log('\n次のステップ:');
      console.log('1. 同期を実行してください: npx ts-node sync-buyers.ts');
      process.exit(1);
    }

    console.log('✅ 買主6647が見つかりました\n');
    console.log('買主番号:', data.buyer_number);
    console.log('氏名:', data.name || '(未設定)');
    console.log('受付日:', data.reception_date || '❌ 未設定');
    console.log('作成日時:', data.db_created_at ? new Date(data.db_created_at).toLocaleString('ja-JP') : '(未設定)');
    console.log('更新日時:', data.db_updated_at ? new Date(data.db_updated_at).toLocaleString('ja-JP') : '(未設定)');
    console.log('');

    if (data.reception_date) {
      const receptionDate = new Date(data.reception_date);
      console.log('✅ 受付日が設定されています！');
      console.log(`   表示形式: ${receptionDate.toLocaleDateString('ja-JP')}`);
      console.log('');
      console.log('次のステップ:');
      console.log('1. ブラウザで確認してください: http://localhost:5173/buyers');
      console.log('2. 買主番号6647を検索して、受付日が表示されることを確認');
    } else {
      console.log('❌ 受付日が未設定です。');
      console.log('');
      console.log('次のステップ:');
      console.log('1. 同期を実行してください: npx ts-node sync-buyers.ts');
      console.log('2. 再度このスクリプトを実行して確認してください');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    process.exit(1);
  }
}

main();
