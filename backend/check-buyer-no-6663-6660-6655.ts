/**
 * 買主No（A列の値）6663, 6660, 6655 の同期状態を確認するスクリプト
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

async function checkBuyersByNo() {
  const targetNos = [6663, 6660, 6655];
  
  console.log('='.repeat(60));
  console.log('買主No 6663, 6660, 6655 の同期状態確認');
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
    console.log(`最初の10列: ${headers.slice(0, 10).join(', ')}`);
    
    // 全データを取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主リスト!A2:BZ5000',
    });
    const rows = dataResponse.data.values || [];
    
    console.log(`\nスプレッドシート総行数: ${rows.length}`);
    
    // A列（No）でターゲットを探す
    console.log('\n' + '='.repeat(60));
    console.log('【スプレッドシートでNo列を検索】');
    
    for (const targetNo of targetNos) {
      let found = false;
      
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const noValue = row[0]; // A列
        
        if (String(noValue) === String(targetNo)) {
          found = true;
          const rowNum = i + 2; // ヘッダー行 + 1
          
          console.log(`\n買主No ${targetNo}: スプレッドシート行 ${rowNum} に存在`);
          console.log(`  A列(No): ${row[0] || '(空)'}`);
          console.log(`  B列: ${row[1] || '(空)'}`);
          console.log(`  C列: ${row[2] || '(空)'}`);
          console.log(`  D列(買主ID): ${row[3] || '(空)'}`);
          console.log(`  E列: ${row[4] || '(空)'}`);
          console.log(`  F列: ${row[5] || '(空)'}`);
          
          // 主要フィールドを探す
          const nameIdx = headers.findIndex((h: string) => h === '氏名' || h === '名前');
          const emailIdx = headers.findIndex((h: string) => h === 'メールアドレス' || h === 'メール');
          const phoneIdx = headers.findIndex((h: string) => h === '電話番号' || h === '電話');
          const propIdx = headers.findIndex((h: string) => h === '物件番号' || h === '案件番号');
          
          if (nameIdx >= 0) console.log(`  氏名(列${nameIdx + 1}): ${row[nameIdx] || '(空)'}`);
          if (emailIdx >= 0) console.log(`  メール(列${emailIdx + 1}): ${row[emailIdx] || '(空)'}`);
          if (phoneIdx >= 0) console.log(`  電話(列${phoneIdx + 1}): ${row[phoneIdx] || '(空)'}`);
          if (propIdx >= 0) console.log(`  物件番号(列${propIdx + 1}): ${row[propIdx] || '(空)'}`);
          
          // DBで検索
          const buyerId = row[3]; // D列が買主ID
          if (buyerId) {
            const { data: dbBuyer } = await supabase
              .from('buyers')
              .select('*')
              .eq('buyer_id', buyerId)
              .single();
            
            if (dbBuyer) {
              console.log(`  → DBに存在: id=${dbBuyer.id}, name=${dbBuyer.name}`);
            } else {
              console.log(`  → DBに存在しません（買主ID: ${buyerId}）`);
            }
          }
          
          break;
        }
      }
      
      if (!found) {
        console.log(`\n買主No ${targetNo}: スプレッドシートに存在しません`);
      }
    }
    
    // 最新のNo値を確認
    console.log('\n' + '='.repeat(60));
    console.log('【スプレッドシートの最新No値】');
    
    const noValues = rows
      .map((r: string[]) => parseInt(r[0], 10))
      .filter((n: number) => !isNaN(n))
      .sort((a: number, b: number) => b - a);
    
    console.log(`\n最大No: ${noValues[0]}`);
    console.log(`最小No: ${noValues[noValues.length - 1]}`);
    console.log(`\n最新10件のNo:`);
    for (let i = 0; i < Math.min(10, noValues.length); i++) {
      console.log(`  ${i + 1}. ${noValues[i]}`);
    }
    
    // 6650-6670の範囲を確認
    console.log(`\n6650-6670の範囲のNo:`);
    const rangeNos = noValues.filter((n: number) => n >= 6650 && n <= 6670);
    if (rangeNos.length > 0) {
      for (const n of rangeNos.sort((a: number, b: number) => a - b)) {
        console.log(`  ${n}`);
      }
    } else {
      console.log('  この範囲のNoは存在しません');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkBuyersByNo().catch(console.error);
