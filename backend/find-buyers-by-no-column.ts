/**
 * 買主リストの「No」列で 6663, 6660, 6655 を検索するスクリプト
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

async function findBuyersByNo() {
  const targetNos = [6663, 6660, 6655];
  
  console.log('='.repeat(60));
  console.log('買主リスト「No」列で 6663, 6660, 6655 を検索');
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
    console.log('最初の10列:', headers.slice(0, 10).join(' | '));
    
    // No列のインデックスを特定
    const noColIndex = headers.findIndex((h: string) => h === 'No' || h === 'No.' || h === 'NO' || h === '番号');
    console.log(`\nNo列インデックス: ${noColIndex} (列名: ${headers[noColIndex] || '不明'})`);
    
    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A2:BZ5000',
    });
    const rows = dataResponse.data.values || [];
    
    console.log(`\nスプレッドシート総データ行数: ${rows.length}`);
    
    // No列の最大値を確認
    let maxNo = 0;
    const noValues: number[] = [];
    for (const row of rows) {
      const noValue = noColIndex >= 0 ? parseInt(row[noColIndex], 10) : parseInt(row[0], 10);
      if (!isNaN(noValue)) {
        noValues.push(noValue);
        if (noValue > maxNo) maxNo = noValue;
      }
    }
    console.log(`No列の最大値: ${maxNo}`);
    console.log(`有効なNo値の数: ${noValues.length}`);
    
    // 対象のNoを検索
    console.log('\n' + '='.repeat(60));
    console.log('【検索結果】');
    
    for (const targetNo of targetNos) {
      let found = false;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const noValue = noColIndex >= 0 ? row[noColIndex] : row[0];
        
        if (String(noValue) === String(targetNo)) {
          found = true;
          const sheetRowNum = i + 2; // ヘッダー行 + 0-indexed
          
          console.log(`\n【No ${targetNo}】 スプレッドシート行 ${sheetRowNum}`);
          
          // 主要フィールドを表示
          const buyerIdCol = headers.findIndex((h: string) => h === '買主ID');
          const nameCol = headers.findIndex((h: string) => h === '氏名' || h === '名前');
          const emailCol = headers.findIndex((h: string) => h === 'メールアドレス' || h === 'メール');
          const phoneCol = headers.findIndex((h: string) => h === '電話番号' || h === '電話');
          const propertyCol = headers.findIndex((h: string) => h === '物件番号' || h === '案件番号');
          
          console.log(`  No: ${noValue}`);
          if (buyerIdCol >= 0) console.log(`  買主ID: ${row[buyerIdCol] || '(空)'}`);
          if (nameCol >= 0) console.log(`  氏名: ${row[nameCol] || '(空)'}`);
          if (emailCol >= 0) console.log(`  メール: ${row[emailCol] || '(空)'}`);
          if (phoneCol >= 0) console.log(`  電話: ${row[phoneCol] || '(空)'}`);
          if (propertyCol >= 0) console.log(`  物件番号: ${row[propertyCol] || '(空)'}`);
          
          // データベースで検索
          const buyerId = buyerIdCol >= 0 ? row[buyerIdCol] : null;
          if (buyerId) {
            const { data: dbBuyer } = await supabase
              .from('buyers')
              .select('id, buyer_id, name, email, property_number, last_synced_at')
              .eq('buyer_id', buyerId)
              .single();
            
            if (dbBuyer) {
              console.log(`  → DB検索結果: 存在します ✓`);
              console.log(`    DB last_synced_at: ${dbBuyer.last_synced_at || '(未同期)'}`);
            } else {
              console.log(`  → DB検索結果: 存在しません ⚠️ 同期されていない`);
            }
          }
          
          break;
        }
      }
      
      if (!found) {
        console.log(`\n【No ${targetNo}】 スプレッドシートに存在しません`);
      }
    }
    
    // 6650-6670の範囲のNoを確認
    console.log('\n' + '='.repeat(60));
    console.log('【6650-6670の範囲のNo確認】');
    
    const rangeNos: { no: number; row: number; buyerId: string }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const noValue = noColIndex >= 0 ? parseInt(row[noColIndex], 10) : parseInt(row[0], 10);
      if (noValue >= 6650 && noValue <= 6670) {
        const buyerIdCol = headers.findIndex((h: string) => h === '買主ID');
        rangeNos.push({
          no: noValue,
          row: i + 2,
          buyerId: buyerIdCol >= 0 ? row[buyerIdCol] || '' : ''
        });
      }
    }
    
    if (rangeNos.length > 0) {
      console.log(`この範囲に ${rangeNos.length} 件のデータがあります:`);
      for (const item of rangeNos.sort((a, b) => a.no - b.no)) {
        console.log(`  No ${item.no}: 行${item.row}, 買主ID=${item.buyerId || '(空)'}`);
      }
    } else {
      console.log('この範囲のNoは存在しません');
    }
    
  } catch (err) {
    console.error('エラー:', err);
  }
}

findBuyersByNo().catch(console.error);
