import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkBuyer6666() {
  console.log('=== 買主番号6666の調査 ===\n');
  
  // 買主データを取得
  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6666')
    .single();
    
  if (error) {
    console.log('エラー:', error);
    return;
  }
  
  if (!buyer) {
    console.log('買主番号6666が見つかりません');
    return;
  }
  
  console.log('買主ID:', buyer.id);
  console.log('買主番号:', buyer.buyer_number);
  console.log('氏名:', buyer.name);
  console.log('\n=== 内覧結果・後続対応フィールド ===');
  console.log('viewing_result_follow_up:', buyer.viewing_result_follow_up);
  console.log('\n=== 後続担当フィールド ===');
  console.log('follow_up_assignee:', buyer.follow_up_assignee);
  console.log('\n=== その他関連フィールド ===');
  console.log('latest_status:', buyer.latest_status);
  console.log('viewing_notes:', buyer.viewing_notes);
  console.log('last_synced_at:', buyer.last_synced_at);
  console.log('updated_at:', buyer.updated_at);
  
  // カラムマッピングの確認
  console.log('\n=== カラムマッピングの確認 ===');
  const columnMapping = await import('./src/config/buyer-column-mapping.json');
  const mapping = columnMapping.spreadsheetToDatabase;
  
  console.log('内覧結果・後続対応のマッピング:');
  console.log('  スプレッドシート列名: ★内覧結果・後続対応');
  console.log('  DB列名:', mapping['★内覧結果・後続対応']);
  
  console.log('\n後続担当のマッピング:');
  console.log('  スプレッドシート列名: 後続担当');
  console.log('  DB列名:', mapping['後続担当']);
  
  // 同期ログの確認
  console.log('\n=== 同期ログの確認 ===');
  const { data: syncLogs, error: syncError } = await supabase
    .from('buyer_sync_logs')
    .select('*')
    .eq('buyer_number', '6666')
    .order('synced_at', { ascending: false })
    .limit(5);
    
  if (syncError) {
    console.log('同期ログ取得エラー:', syncError);
  } else if (syncLogs && syncLogs.length > 0) {
    console.log(`最近の同期ログ (${syncLogs.length}件):`);
    syncLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.synced_at}`);
      console.log('   ステータス:', log.status);
      if (log.error_message) {
        console.log('   エラー:', log.error_message);
      }
    });
  } else {
    console.log('同期ログが見つかりません');
  }
}

checkBuyer6666().catch(console.error);
