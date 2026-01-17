import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBuyersSchema() {
  console.log('=== buyersテーブルのスキーマ確認 ===\n');
  
  // PostgreSQLのinformation_schemaから列情報を取得
  const { data, error } = await supabase
    .rpc('get_table_columns', { table_name: 'buyers' })
    .select('*');
    
  if (error) {
    console.log('RPCエラー、直接SQLで確認します...\n');
    
    // 直接SQLクエリを実行
    const { data: columns, error: sqlError } = await supabase
      .from('buyers')
      .select('*')
      .limit(1);
      
    if (sqlError) {
      console.log('SQLエラー:', sqlError);
      return;
    }
    
    if (columns && columns.length > 0) {
      const columnNames = Object.keys(columns[0]);
      console.log(`テーブルの列数: ${columnNames.length}\n`);
      
      // viewing_result_follow_upとfollow_up_assigneeを探す
      const viewingResultExists = columnNames.includes('viewing_result_follow_up');
      const followUpAssigneeExists = columnNames.includes('follow_up_assignee');
      
      console.log('=== 対象フィールドの存在確認 ===');
      console.log(`viewing_result_follow_up: ${viewingResultExists ? '✓ 存在' : '✗ 存在しない'}`);
      console.log(`follow_up_assignee: ${followUpAssigneeExists ? '✓ 存在' : '✗ 存在しない'}`);
      
      if (viewingResultExists) {
        // viewing_result_follow_upの値を確認
        const { data: buyers, error: buyerError } = await supabase
          .from('buyers')
          .select('buyer_number, viewing_result_follow_up, follow_up_assignee')
          .not('viewing_result_follow_up', 'is', null)
          .limit(10);
          
        if (buyerError) {
          console.log('\nviewing_result_follow_upの値取得エラー:', buyerError);
        } else {
          console.log(`\nviewing_result_follow_upに値がある買主: ${buyers?.length || 0}件`);
          if (buyers && buyers.length > 0) {
            console.log('サンプル:');
            buyers.slice(0, 3).forEach(b => {
              console.log(`  買主${b.buyer_number}: ${String(b.viewing_result_follow_up).substring(0, 50)}...`);
            });
          }
        }
      }
      
      // 全列名を表示
      console.log('\n=== 全列名（アルファベット順） ===');
      columnNames.sort().forEach((col, index) => {
        if (col.includes('viewing') || col.includes('follow')) {
          console.log(`${index + 1}. ${col} ★`);
        } else {
          console.log(`${index + 1}. ${col}`);
        }
      });
    }
  } else {
    console.log('列情報:', data);
  }
}

checkBuyersSchema().catch(console.error);
