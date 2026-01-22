import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';
import dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function syncBuyer2064Only() {
  try {
    console.log('=== 買主番号2064のみを同期 ===\n');

    // サービスアカウントキーを読み込む
    const keyPath = path.join(__dirname, 'google-service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`ヘッダー: ${headers.length}列\n`);

    // 2行目のデータを取得（買主番号2064）
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ2`,
    });
    const row = dataResponse.data.values?.[0];

    if (!row) {
      console.log('2行目にデータが見つかりません');
      return;
    }

    console.log('スプレッドシートの2行目データ:');
    console.log(`  買主番号列(4): ${row[4]}`);
    console.log(`  氏名列(6): ${row[6]}`);
    console.log(`  メール列(36): ${row[36]}`);
    console.log(`  受付日列(5): ${row[5]}\n`);

    // カラムマッパーでマッピング
    const columnMapper = new BuyerColumnMapper();
    const data = columnMapper.mapSpreadsheetToDatabase(headers, row);

    console.log('マッピング後のデータ:');
    console.log(`  buyer_number: ${data.buyer_number}`);
    console.log(`  name: ${data.name}`);
    console.log(`  email: ${data.email}`);
    console.log(`  reception_date: ${data.reception_date}`);
    
    // 50文字を超えるフィールドをチェック
    console.log('\n50文字を超えるフィールドをチェック:');
    Object.entries(data).forEach(([key, value]) => {
      if (typeof value === 'string' && value.length > 50) {
        console.log(`  ❌ ${key}: ${value.length}文字 - "${value.substring(0, 60)}..."`);
      }
    });
    console.log();

    // 買主番号チェック
    if (!data.buyer_number || String(data.buyer_number).trim() === '') {
      console.log('❌ 買主番号が空です。スキップされます。');
      return;
    }

    console.log('✓ 買主番号は有効です\n');

    // Supabaseに接続
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 既存レコードを確認
    console.log('データベースで既存レコードを確認...');
    const { data: existing, error: selectError } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, email')
      .eq('buyer_number', data.buyer_number)
      .single();

    if (selectError && selectError.code !== 'PGRST116') {
      console.log('❌ 検索エラー:', selectError.message);
    } else if (existing) {
      console.log('✓ 既存レコードが見つかりました:');
      console.log(`  ID: ${existing.id}`);
      console.log(`  買主番号: ${existing.buyer_number}`);
      console.log(`  氏名: ${existing.name}`);
      console.log(`  メール: ${existing.email}\n`);
    } else {
      console.log('既存レコードは見つかりませんでした\n');
    }

    // Upsert実行
    console.log('Upsert実行中...');
    const { data: upsertData, error: upsertError } = await supabase
      .from('buyers')
      .upsert(
        { 
          ...data, 
          synced_at: new Date().toISOString(),
          db_updated_at: new Date().toISOString()
        },
        { onConflict: 'buyer_number' }
      )
      .select();

    if (upsertError) {
      console.log('❌ Upsertエラー:', upsertError.message);
      console.log('エラー詳細:', JSON.stringify(upsertError, null, 2));
    } else {
      console.log('✓ Upsert成功！');
      if (upsertData && upsertData.length > 0) {
        console.log('登録されたデータ:');
        console.log(`  ID: ${upsertData[0].id}`);
        console.log(`  買主番号: ${upsertData[0].buyer_number}`);
        console.log(`  氏名: ${upsertData[0].name}`);
        console.log(`  メール: ${upsertData[0].email}`);
      }
    }

    // 確認
    console.log('\n最終確認: データベースで買主番号2064を検索...');
    const { data: finalCheck, error: finalError } = await supabase
      .from('buyers')
      .select('buyer_number, name, email, reception_date')
      .eq('buyer_number', '2064')
      .single();

    if (finalError) {
      console.log('❌ 見つかりませんでした:', finalError.message);
    } else {
      console.log('✓ 買主番号2064が登録されました！');
      console.log(JSON.stringify(finalCheck, null, 2));
    }

  } catch (error) {
    console.error('エラー:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);
    }
  }
}

syncBuyer2064Only();
