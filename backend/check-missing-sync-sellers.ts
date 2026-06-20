/**
 * 次電日がスプレッドシートと一致しない売主を全て検出
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';

async function checkMissingSyncSellers() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('環境変数が設定されていません');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('=== 次電日不一致の売主を検出 ===\n');
  
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
  
  // 3. 不一致を検出
  const columnMapper = new ColumnMapper();
  const mismatches: { sellerNumber: string; dbDate: string | null; sheetDate: string | null }[] = [];
  
  for (const seller of allSellers) {
    const row = rowsBySellerNumber.get(seller.seller_number);
    
    if (!row) continue;
    
    const nextCallDateRaw = row['次電日'];
    
    // スプレッドシートに次電日がない場合
    if (!nextCallDateRaw) {
      if (seller.next_call_date) {
        mismatches.push({
          sellerNumber: seller.seller_number,
          dbDate: seller.next_call_date,
          sheetDate: null,
        });
      }
      continue;
    }
    
    // パース
    const mappedData = columnMapper.mapToDatabase({ '次電日': nextCallDateRaw });
    const sheetDate = mappedData.next_call_date as string | null;
    
    // 比較
    if (seller.next_call_date !== sheetDate) {
      mismatches.push({
        sellerNumber: seller.seller_number,
        dbDate: seller.next_call_date,
        sheetDate: sheetDate,
      });
    }
  }
  
  console.log(`❌ 不一致: ${mismatches.length}件\n`);
  
  if (mismatches.length > 0) {
    console.log('=== 不一致リスト ===');
    mismatches.forEach(m => {
      console.log(`  ${m.sellerNumber}: DB=${m.dbDate} → スプシ=${m.sheetDate}`);
    });
  }
  
  return mismatches;
}

checkMissingSyncSellers().catch(console.error);
