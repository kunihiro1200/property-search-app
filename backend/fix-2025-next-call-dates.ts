/**
 * 2025年の次電日を持つ売主を再同期して修正
 * 
 * スプレッドシートから正しい日付（シリアル値）を取得して更新
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function fix2025NextCallDates() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== 2025年の次電日を修正 ===\n');
  
  // 1. スプレッドシートから全データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');
  
  const allRows = await sheetsClient.readAll();
  console.log(`📊 スプレッドシートから ${allRows.length} 行取得\n`);
  
  // 売主番号でインデックス化
  const rowsBySellerNumber = new Map<string, any>();
  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    if (sellerNumber) {
      rowsBySellerNumber.set(String(sellerNumber), row);
    }
  }
  
  // 2. 2025年の次電日を持つ売主を取得
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select('seller_number, next_call_date')
    .gte('next_call_date', '2025-01-01')
    .lt('next_call_date', '2026-01-01')
    .is('deleted_at', null);
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }
  
  console.log(`📊 2025年の次電日を持つ売主: ${sellers?.length || 0}件\n`);
  
  // 3. 各売主の次電日を修正
  const columnMapper = new ColumnMapper();
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const seller of sellers || []) {
    const row = rowsBySellerNumber.get(seller.seller_number);
    
    if (!row) {
      console.log(`⚠️ ${seller.seller_number}: スプレッドシートに見つかりません`);
      skippedCount++;
      continue;
    }
    
    // スプレッドシートの次電日を取得
    const nextCallDateRaw = row['次電日'];
    
    if (!nextCallDateRaw) {
      console.log(`⚠️ ${seller.seller_number}: 次電日が空です`);
      skippedCount++;
      continue;
    }
    
    // ColumnMapperで日付をパース
    const mappedData = columnMapper.mapToDatabase({ '次電日': nextCallDateRaw });
    const newNextCallDate = mappedData.next_call_date;
    
    if (!newNextCallDate) {
      console.log(`⚠️ ${seller.seller_number}: 次電日のパースに失敗 (raw: ${nextCallDateRaw})`);
      skippedCount++;
      continue;
    }
    
    // 日付が変わった場合のみ更新
    if (newNextCallDate !== seller.next_call_date) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ next_call_date: newNextCallDate })
        .eq('seller_number', seller.seller_number);
      
      if (updateError) {
        console.log(`❌ ${seller.seller_number}: 更新エラー - ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${seller.seller_number}: ${seller.next_call_date} → ${newNextCallDate}`);
        updatedCount++;
      }
    } else {
      skippedCount++;
    }
  }
  
  console.log('\n=== 結果 ===');
  console.log(`✅ 更新: ${updatedCount}件`);
  console.log(`⚠️ スキップ: ${skippedCount}件`);
  console.log(`❌ エラー: ${errorCount}件`);
}

fix2025NextCallDates().catch(console.error);
