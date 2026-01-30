/**
 * AA13312の次電日同期問題を調査
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function checkAA13312() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== AA13312 次電日同期調査 ===\n');
  
  // 1. データベースの値を確認
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date, status, name, deleted_at')
    .eq('seller_number', 'AA13312')
    .single();
  
  if (error) {
    console.error('DBエラー:', error.message);
  } else {
    console.log('📊 データベースの値:');
    console.log(`  売主番号: ${seller.seller_number}`);
    console.log(`  名前: ${seller.name}`);
    console.log(`  次電日: ${seller.next_call_date}`);
    console.log(`  ステータス: ${seller.status}`);
    console.log(`  削除日: ${seller.deleted_at}`);
  }
  
  // 2. スプレッドシートの値を確認
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  console.log('\n✅ Google Sheets認証成功');
  
  const allRows = await sheetsClient.readAll();
  
  // AA13312を検索
  const row = allRows.find(r => r['売主番号'] === 'AA13312');
  
  if (!row) {
    console.log('\n❌ スプレッドシートにAA13312が見つかりません');
    return;
  }
  
  console.log('\n📊 スプレッドシートの値:');
  console.log(`  売主番号: ${row['売主番号']}`);
  console.log(`  名前: ${row['名前(漢字のみ）']}`);
  console.log(`  次電日（生データ）: ${row['次電日']} (型: ${typeof row['次電日']})`);
  console.log(`  ステータス: ${row['状況（当社）']}`);
  
  // 3. ColumnMapperでパース
  const columnMapper = new ColumnMapper();
  const mappedData = columnMapper.mapToDatabase({ '次電日': row['次電日'] });
  
  console.log('\n📊 パース結果:');
  console.log(`  パース後の次電日: ${mappedData.next_call_date}`);
  
  // 4. 比較
  console.log('\n📊 比較:');
  console.log(`  DB: ${seller?.next_call_date || 'null'}`);
  console.log(`  スプシ（パース後）: ${mappedData.next_call_date || 'null'}`);
  
  if (seller?.next_call_date === mappedData.next_call_date) {
    console.log('\n✅ 一致しています');
  } else {
    console.log('\n❌ 不一致です！');
    
    // 修正
    if (mappedData.next_call_date) {
      console.log('\n🔧 修正を実行...');
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ next_call_date: mappedData.next_call_date })
        .eq('seller_number', 'AA13312');
      
      if (updateError) {
        console.log(`❌ 更新エラー: ${updateError.message}`);
      } else {
        console.log(`✅ 修正完了: ${seller?.next_call_date} → ${mappedData.next_call_date}`);
      }
    }
  }
}

checkAA13312().catch(console.error);
