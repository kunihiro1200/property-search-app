// 買主6648の同期を実行してエラー詳細を取得
import { config } from 'dotenv';
config();

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function testSync() {
  console.log('=== 買主6648の同期テスト ===\n');

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1. ヘッダー取得
  console.log('1. ヘッダー取得中...');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  const buyerNumberIndex = headers.indexOf('買主番号');

  // 2. 全データ取得
  console.log('2. 全データ取得中...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];

  // 3. 買主6648を検索
  console.log('3. 買主6648を検索中...');
  let row6648Data: any[] = [];
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    if (String(buyerNumber).trim() === '6648') {
      row6648Data = row;
      console.log(`   ✅ 買主6648が見つかりました（行${i + 2}）\n`);
      break;
    }
  }

  if (row6648Data.length === 0) {
    console.log('   ❌ 買主6648が見つかりません');
    return;
  }

  // 4. マッピング
  console.log('4. データをマッピング中...');
  const mapper = new BuyerColumnMapper();
  const data = mapper.mapSpreadsheetToDatabase(headers, row6648Data);
  console.log(`   buyer_number: ${data.buyer_number}`);
  console.log(`   name: ${data.name}`);
  console.log(`   phone_number: ${data.phone_number}\n`);

  // 5. 既存レコード確認
  console.log('5. 既存レコード確認中...');
  const { data: existing, error: selectError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name')
    .eq('buyer_number', data.buyer_number)
    .single();

  if (selectError) {
    if (selectError.code === 'PGRST116') {
      console.log('   既存レコードなし（新規作成）\n');
    } else {
      console.log(`   ❌ SELECT エラー: ${selectError.message}\n`);
    }
  } else {
    console.log(`   既存レコードあり: ID=${existing.id}, 名前=${existing.name}\n`);
  }

  // 6. Upsert実行
  console.log('6. Upsert実行中...');
  const upsertData: any = {
    ...data,
    last_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  console.log('   Upsertデータのサンプル:');
  console.log(`   - buyer_number: ${upsertData.buyer_number}`);
  console.log(`   - name: ${upsertData.name}`);
  console.log(`   - phone_number: ${upsertData.phone_number}`);
  console.log(`   - email: ${upsertData.email}`);
  console.log(`   - last_synced_at: ${upsertData.last_synced_at}\n`);

  const { data: result, error: upsertError } = await supabase
    .from('buyers')
    .upsert(upsertData, { onConflict: 'buyer_number' })
    .select();

  if (upsertError) {
    console.log('   ❌ UPSERT エラー:');
    console.log(`   メッセージ: ${upsertError.message}`);
    console.log(`   コード: ${upsertError.code}`);
    console.log(`   詳細: ${upsertError.details}`);
    console.log(`   ヒント: ${upsertError.hint}\n`);

    // エラーの種類を判定
    if (upsertError.message.includes('column')) {
      console.log('   ⚠️  カラム関連のエラーです');
      console.log('   考えられる原因:');
      console.log('   - データベーススキーマとマッピングの不一致');
      console.log('   - 存在しないカラムへの書き込み');
      console.log('   - カラム名のタイポ\n');
    } else if (upsertError.message.includes('constraint')) {
      console.log('   ⚠️  制約違反エラーです');
      console.log('   考えられる原因:');
      console.log('   - NOT NULL制約違反');
      console.log('   - CHECK制約違反');
      console.log('   - UNIQUE制約違反\n');
    } else if (upsertError.message.includes('type')) {
      console.log('   ⚠️  型エラーです');
      console.log('   考えられる原因:');
      console.log('   - データ型の不一致');
      console.log('   - 数値フィールドに文字列を挿入\n');
    }
  } else {
    console.log('   ✅ UPSERT 成功！');
    console.log(`   結果: ${JSON.stringify(result, null, 2)}\n`);
  }

  // 7. 最終確認
  console.log('7. 最終確認...');
  const { data: finalCheck, error: finalError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, last_synced_at')
    .eq('buyer_number', '6648')
    .single();

  if (finalError) {
    console.log(`   ❌ 最終確認エラー: ${finalError.message}`);
  } else if (finalCheck) {
    console.log('   ✅ 買主6648がデータベースに存在します！');
    console.log(`   ID: ${finalCheck.id}`);
    console.log(`   名前: ${finalCheck.name}`);
    console.log(`   最終同期: ${finalCheck.last_synced_at}`);
  } else {
    console.log('   ❌ 買主6648がデータベースに見つかりません');
  }
}

testSync().catch(console.error);
