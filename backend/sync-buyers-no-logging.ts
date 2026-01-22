// 買主リスト同期スクリプト（ログなし版）
// buyer_sync_logsテーブルが存在しない場合に使用
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';
const BATCH_SIZE = 50;

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('=== 買主リスト同期開始（ログなし版） ===');
  console.log(`開始時刻: ${new Date().toLocaleString('ja-JP')}`);
  console.log('');

  const startTime = Date.now();
  const columnMapper = new BuyerColumnMapper();

  let created = 0;
  let updated = 0;
  let failed = 0;
  let skipped = 0;
  const errors: { row: number; buyerNumber: string; message: string }[] = [];

  try {
    // Google Sheets認証（サービスアカウント）
    console.log('Google Sheets APIに認証中...');
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    console.log('ヘッダーを取得中...');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`ヘッダー数: ${headers.length}`);

    // データ取得
    console.log('スプレッドシートからデータを取得中...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    console.log(`データ行数: ${rows.length}`);
    console.log('');

    // バッチ処理
    const totalBatches = Math.ceil(rows.length / BATCH_SIZE);
    
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const start = batchIndex * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, rows.length);
      const batch = rows.slice(start, end);
      
      console.log(`バッチ ${batchIndex + 1}/${totalBatches} 処理中 (行 ${start + 2} ～ ${end + 1})`);
      
      for (let i = 0; i < batch.length; i++) {
        const row = batch[i];
        const rowNumber = start + i + 2;

        try {
          const data = columnMapper.mapSpreadsheetToDatabase(headers as string[], row);
          
          // 買主番号がない場合はスキップ
          if (!data.buyer_number || String(data.buyer_number).trim() === '') {
            skipped++;
            continue;
          }

          const buyerNumber = String(data.buyer_number);

          // 既存レコードを確認
          const { data: existing } = await supabase
            .from('buyers')
            .select('id')
            .eq('buyer_number', buyerNumber)
            .single();

          // Upsert（last_synced_atはスキーマキャッシュの問題があるため除外）
          const { error } = await supabase
            .from('buyers')
            .upsert(
              { 
                ...data, 
                updated_at: new Date().toISOString()
              },
              { onConflict: 'buyer_number' }
            );

          if (error) {
            failed++;
            errors.push({
              row: rowNumber,
              buyerNumber,
              message: error.message,
            });
          } else {
            if (existing) {
              updated++;
            } else {
              created++;
            }
          }
        } catch (error: any) {
          failed++;
          errors.push({
            row: rowNumber,
            buyerNumber: row[4] || '不明',
            message: error.message,
          });
        }
      }
    }

    const duration = Date.now() - startTime;

    console.log('');
    console.log('=== 同期結果 ===');
    console.log(`作成: ${created}件`);
    console.log(`更新: ${updated}件`);
    console.log(`失敗: ${failed}件`);
    console.log(`スキップ: ${skipped}件`);
    console.log(`処理時間: ${(duration / 1000).toFixed(2)}秒`);

    if (errors.length > 0) {
      console.log('');
      console.log('=== エラー詳細（最初の10件） ===');
      errors.slice(0, 10).forEach((err) => {
        console.log(`  行${err.row}: ${err.buyerNumber} - ${err.message}`);
      });
      if (errors.length > 10) {
        console.log(`  ... 他 ${errors.length - 10}件のエラー`);
      }
    }

    console.log('');
    console.log(`終了時刻: ${new Date().toLocaleString('ja-JP')}`);
    console.log('=== 同期完了 ===');

  } catch (error: any) {
    console.error('同期エラー:', error.message);
    process.exit(1);
  }
}

main();
