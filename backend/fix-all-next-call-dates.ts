/**
 * 全ての次電日をスプレッドシートと同期
 * 
 * 不一致を検出して全て修正
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function fixAllNextCallDates() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== 全ての次電日を同期 ===\n');
  
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
  
  // 2. DBから全売主を取得（ページネーション対応）
  let allSellers: any[] = [];
  let page = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number, next_call_date')
      .is('deleted_at', null)
      .range(page * pageSize, (page + 1) * pageSize - 1);
    
    if (error) {
      console.error('DBエラー:', error.message);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allSellers = allSellers.concat(data);
    
    if (data.length < pageSize) break;
    page++;
  }
  
  console.log(`📊 DBから ${allSellers.length} 件の売主を取得\n`);
  
  // 3. 不一致を検出して修正
  const columnMapper = new ColumnMapper();
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const seller of allSellers) {
    const row = rowsBySellerNumber.get(seller.seller_number);
    
    if (!row) {
      skippedCount++;
      continue;
    }
    
    const nextCallDateRaw = row['次電日'];
    
    // スプレッドシートに次電日がない場合
    if (!nextCallDateRaw) {
      // DBにあってスプシにない場合はnullに更新
      if (seller.next_call_date) {
        const { error: updateError } = await supabase
          .from('sellers')
          .update({ next_call_date: null })
          .eq('seller_number', seller.seller_number);
        
        if (updateError) {
          errorCount++;
        } else {
          console.log(`✅ ${seller.seller_number}: ${seller.next_call_date} → null`);
          updatedCount++;
        }
      } else {
        skippedCount++;
      }
      continue;
    }
    
    // パース
    const mappedData = columnMapper.mapToDatabase({ '次電日': nextCallDateRaw });
    const sheetDate = mappedData.next_call_date as string | null;
    
    // 比較
    if (seller.next_call_date !== sheetDate) {
      const { error: updateError } = await supabase
        .from('sellers')
        .update({ next_call_date: sheetDate })
        .eq('seller_number', seller.seller_number);
      
      if (updateError) {
        console.log(`❌ ${seller.seller_number}: 更新エラー - ${updateError.message}`);
        errorCount++;
      } else {
        console.log(`✅ ${seller.seller_number}: ${seller.next_call_date} → ${sheetDate}`);
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

fixAllNextCallDates().catch(console.error);
