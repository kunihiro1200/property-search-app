// 買主6648の同期エラーを確認
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSyncError() {
  try {
    console.log('=== 買主6648同期エラー確認 ===\n');

    // 1. 買主6648がデータベースに存在するか確認
    console.log('1. データベースで買主番号6648を検索:');
    const { data: buyers, error: buyerError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6648');

    if (buyerError) {
      console.log(`   ✗ エラー: ${buyerError.message}`);
      console.log(`   詳細: ${JSON.stringify(buyerError, null, 2)}`);
    } else if (buyers && buyers.length > 0) {
      console.log(`   ✓ 買主番号6648が${buyers.length}件見つかりました`);
      buyers.forEach((buyer, index) => {
        console.log(`   [${index + 1}]`);
        console.log(`      ID: ${buyer.id}`);
        console.log(`      名前: ${buyer.name}`);
        console.log(`      最終同期: ${buyer.last_synced_at || '未設定'}`);
      });
    } else {
      console.log(`   ✗ 買主番号6648が見つかりません`);
    }
    console.log('');

    // 2. 同期ログを確認
    console.log('2. 最新の同期ログを確認:');
    const { data: logs, error: logsError } = await supabase
      .from('buyer_sync_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(5);

    if (logsError) {
      console.log(`   ✗ エラー: ${logsError.message}`);
    } else if (logs && logs.length > 0) {
      logs.forEach((log, index) => {
        console.log(`   [${index + 1}] ${log.started_at}`);
        console.log(`       状態: ${log.status}`);
        console.log(`       処理: ${log.records_processed}件`);
        console.log(`       成功: ${log.records_created + log.records_updated}件`);
        console.log(`       失敗: ${log.records_failed}件`);
        if (log.error_details) {
          const errors = JSON.parse(log.error_details);
          // 買主6648関連のエラーを探す
          const buyer6648Errors = errors.filter((e: any) => 
            e.buyerNumber === '6648' || e.message.includes('6648')
          );
          if (buyer6648Errors.length > 0) {
            console.log(`       ⚠️ 買主6648関連のエラー:`);
            buyer6648Errors.forEach((e: any) => {
              console.log(`          行${e.row}: ${e.message}`);
            });
          }
        }
        console.log('');
      });
    } else {
      console.log(`   ℹ️ 同期ログが見つかりません`);
    }

    // 3. buyersテーブルのスキーマを確認
    console.log('3. buyersテーブルのスキーマを確認:');
    const { data: schema, error: schemaError } = await supabase
      .rpc('get_table_schema', { table_name: 'buyers' });

    if (schemaError) {
      console.log(`   ⚠️ スキーマ取得エラー (RPCが存在しない可能性): ${schemaError.message}`);
      
      // 代替方法: 実際にクエリを試す
      console.log('   代替方法: テストクエリを実行...');
      const { error: testError } = await supabase
        .from('buyers')
        .select('name')
        .limit(1);
      
      if (testError) {
        console.log(`   ✗ nameカラムエラー: ${testError.message}`);
      } else {
        console.log(`   ✓ nameカラムは存在します`);
      }
    } else {
      console.log(`   ✓ スキーマ取得成功`);
      if (schema) {
        const nameColumn = schema.find((col: any) => col.column_name === 'name');
        if (nameColumn) {
          console.log(`   ✓ nameカラム: ${nameColumn.data_type}`);
        } else {
          console.log(`   ✗ nameカラムが見つかりません`);
        }
      }
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkSyncError();
