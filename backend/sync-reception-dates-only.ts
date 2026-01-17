// 受付日のみを同期するスクリプト（高速版）
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 受付日のみ同期開始 ===');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  const startTime = Date.now();
  const columnMapper = new BuyerColumnMapper();

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  try {
    // Google Sheets認証
    console.log('Google Sheets APIに認証中...');
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    
    const buyerNumberIndex = headers.findIndex((h: string) => h === '買主番号');
    const receptionDateIndex = headers.findIndex((h: string) => h === '受付日');
    
    console.log(`買主番号カラムインデックス: ${buyerNumberIndex}`);
    console.log(`受付日カラムインデックス: ${receptionDateIndex}`);

    // データ取得
    console.log('スプレッドシートからデータを取得中...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    console.log(`データ行数: ${rows.length}`);
    console.log('');

    // 受付日データを収集
    const receptionDateMap: Map<string, string> = new Map();
    
    rows.forEach(row => {
      const buyerNumber = row[buyerNumberIndex];
      const receptionDate = row[receptionDateIndex];
      
      if (buyerNumber && receptionDate) {
        // 日付をパース
        const parsedDate = columnMapper['parseDate'](receptionDate);
        if (parsedDate) {
          receptionDateMap.set(String(buyerNumber), parsedDate);
        }
      }
    });

    console.log(`受付日データ数: ${receptionDateMap.size}件`);
    console.log('');

    // バッチ更新
    const entries = Array.from(receptionDateMap.entries());
    const batchSize = 100;
    const totalBatches = Math.ceil(entries.length / batchSize);

    for (let i = 0; i < totalBatches; i++) {
      const start = i * batchSize;
      const end = Math.min(start + batchSize, entries.length);
      const batch = entries.slice(start, end);
      
      console.log(`バッチ ${i + 1}/${totalBatches} 処理中...`);
      
      for (const [buyerNumber, receptionDate] of batch) {
        try {
          const { error } = await supabase
            .from('buyers')
            .update({ reception_date: receptionDate })
            .eq('buyer_number', buyerNumber);

          if (error) {
            if (error.message.includes('0 rows')) {
              skipped++; // 買主が存在しない
            } else {
              failed++;
              console.error(`  エラー (${buyerNumber}): ${error.message}`);
            }
          } else {
            updated++;
          }
        } catch (err: any) {
          failed++;
          console.error(`  例外 (${buyerNumber}): ${err.message}`);
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('');
    console.log('=== 同期結果 ===');
    console.log(`更新: ${updated}件`);
    console.log(`スキップ（存在しない）: ${skipped}件`);
    console.log(`失敗: ${failed}件`);
    console.log(`処理時間: ${(duration / 1000).toFixed(2)}秒`);
    console.log('');
    console.log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('=== 同期完了 ===');

  } catch (error: any) {
    console.error('同期エラー:', error.message);
    process.exit(1);
  }
}

main();
