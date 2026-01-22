/**
 * 買主番号（行番号）6663, 6660, 6655 の同期状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

async function checkBuyerRows() {
  // 行番号（ヘッダーが1行目なので、データは2行目から）
  // 買主番号6663 = スプレッドシート行6664（ヘッダー+1）
  const targetRows = [6663, 6660, 6655];
  
  console.log('='.repeat(60));
  console.log('買主番号（行番号）6663, 6660, 6655 の同期状態確認');
  console.log('='.repeat(60));
  
  try {
    const sheets = await getGoogleSheetsClient();
    const spreadsheetId = process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID;
    
    // ヘッダーを取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A1:BZ1',
    });
    const headers = headerResponse.data.values?.[0] || [];
    
    console.log(`\nヘッダー列数: ${headers.length}`);
    
    // 主要な列のインデックスを特定
    const colIndexes: Record<string, number> = {};
    const importantCols = ['No', 'No.', '買主ID', '氏名', '名前', 'メールアドレス', 'メール', '電話番号', '電話', '物件番号', '案件番号'];
    
    for (const col of importantCols) {
      const idx = headers.findIndex((h: string) => h === col);
      if (idx >= 0) {
        colIndexes[col] = idx;
      }
    }
    
    console.log('\n主要列のインデックス:');
    for (const [name, idx] of Object.entries(colIndexes)) {
      console.log(`  ${name}: 列${idx + 1} (${String.fromCharCode(65 + idx)})`);
    }
    
    // 対象行のデータを取得
    console.log('\n' + '='.repeat(60));
    console.log('【スプレッドシートのデータ】');
    
    for (const rowNum of targetRows) {
      // スプレッドシートの行番号（ヘッダーが1行目）
      const sheetRow = rowNum + 1; // データ行は2行目から
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `買主リスト!A${sheetRow}:BZ${sheetRow}`,
      });
      
      const row = response.data.values?.[0];
      
      if (!row || row.length === 0 || row.every((cell: string) => !cell)) {
        console.log(`\n買主番号 ${rowNum} (行${sheetRow}): データなし（空行）`);
        continue;
      }
      
      console.log(`\n買主番号 ${rowNum} (行${sheetRow}):`);
      
      // No列
      const noIdx = colIndexes['No'] ?? colIndexes['No.'] ?? 0;
      console.log(`  No: ${row[noIdx] || '(空)'}`);
      
      // 買主ID
      const buyerIdIdx = colIndexes['買主ID'] ?? -1;
      if (buyerIdIdx >= 0) {
        console.log(`  買主ID: ${row[buyerIdIdx] || '(空)'}`);
      }
      
      // 氏名
      const nameIdx = colIndexes['氏名'] ?? colIndexes['名前'] ?? -1;
      if (nameIdx >= 0) {
        console.log(`  氏名: ${row[nameIdx] || '(空)'}`);
      }
      
      // メール
      const emailIdx = colIndexes['メールアドレス'] ?? colIndexes['メール'] ?? -1;
      if (emailIdx >= 0) {
        console.log(`  メール: ${row[emailIdx] || '(空)'}`);
      }
      
      // 電話
      const phoneIdx = colIndexes['電話番号'] ?? colIndexes['電話'] ?? -1;
      if (phoneIdx >= 0) {
        console.log(`  電話: ${row[phoneIdx] || '(空)'}`);
      }
      
      // 物件番号
      const propIdx = colIndexes['物件番号'] ?? colIndexes['案件番号'] ?? -1;
      if (propIdx >= 0) {
        console.log(`  物件番号: ${row[propIdx] || '(空)'}`);
      }
      
      // 最初の15列を表示
      console.log(`  最初の15列: ${row.slice(0, 15).map((v: string, i: number) => `[${i}]${v || ''}`).join(' | ')}`);
    }
    
    // データベースで対応するデータを探す
    console.log('\n' + '='.repeat(60));
    console.log('【データベースの状態】');
    
    // スプレッドシートから取得した情報でDBを検索
    for (const rowNum of targetRows) {
      const sheetRow = rowNum + 1;
      
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `買主リスト!A${sheetRow}:BZ${sheetRow}`,
      });
      
      const row = response.data.values?.[0];
      if (!row) continue;
      
      // No列の値を取得
      const noIdx = colIndexes['No'] ?? colIndexes['No.'] ?? 0;
      const noValue = row[noIdx];
      
      if (noValue) {
        // DBでNoで検索
        const { data: buyers } = await supabase
          .from('buyers')
          .select('id, buyer_id, name, email, phone, property_number, created_at, last_synced_at')
          .or(`buyer_id.eq.${noValue},id.eq.${noValue}`)
          .limit(5);
        
        if (buyers && buyers.length > 0) {
          console.log(`\n買主番号 ${rowNum} (No: ${noValue}): DBに存在`);
          for (const b of buyers) {
            console.log(`  DB ID: ${b.id}, buyer_id: ${b.buyer_id}, 名前: ${b.name}, last_synced: ${b.last_synced_at}`);
          }
        } else {
          console.log(`\n買主番号 ${rowNum} (No: ${noValue}): DBに存在しません`);
        }
      }
    }
    
    // 総数比較
    console.log('\n' + '='.repeat(60));
    console.log('【総数比較】');
    
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A2:A10000',
    });
    const allRows = allDataResponse.data.values || [];
    const nonEmptyRows = allRows.filter((r: string[]) => r[0] && r[0].trim());
    
    const { count: dbCount } = await supabase
      .from('buyers')
      .select('*', { count: 'exact', head: true });
    
    console.log(`スプレッドシート有効行数: ${nonEmptyRows.length}`);
    console.log(`データベース買主数: ${dbCount}`);
    console.log(`差分: ${nonEmptyRows.length - (dbCount || 0)}`);
    
  } catch (err) {
    console.error('エラー:', err);
  }
}

checkBuyerRows().catch(console.error);
