import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const BUYER_SHEET_NAME = '買主リスト';

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient as any });
}

async function forceSyncBuyer6648() {
  console.log('=== 買主6648の強制同期 ===\n');

  const sheets = await getGoogleSheetsClient();
  const columnMapper = new BuyerColumnMapper();

  // スプレッドシートから全データを取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${BUYER_SHEET_NAME}!A:Z`,
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  // 買主番号のカラムインデックスを見つける
  const buyerNumberIndex = headers.findIndex((h: string) => 
    h === '買主番号' || h === 'buyer_number'
  );

  if (buyerNumberIndex === -1) {
    console.error('買主番号カラムが見つかりません');
    return;
  }

  // 6648を検索
  const buyer6648Row = rows.find((row, index) => 
    index > 0 && row[buyerNumberIndex] === '6648'
  );

  if (!buyer6648Row) {
    console.error('買主6648がスプレッドシートに見つかりません');
    return;
  }

  console.log('スプレッドシートから買主6648を発見');
  console.log('行データ:', buyer6648Row);
  console.log('\n');

  // データをマッピング
  console.log('データをマッピング中...');
  const mappedData = columnMapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
  
  console.log('マッピング結果:');
  console.log(JSON.stringify(mappedData, null, 2));
  console.log('\n');

  // データベースに既存レコードがあるか確認
  console.log('既存レコードを確認中...');
  const { data: existing, error: checkError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (checkError && checkError.code !== 'PGRST116') {
    console.error('既存レコード確認エラー:', checkError);
  } else if (existing) {
    console.log('既存レコードが見つかりました:');
    console.log(JSON.stringify(existing, null, 2));
  } else {
    console.log('既存レコードなし（新規作成）');
  }
  console.log('\n');

  // Upsertを実行（タイムスタンプフィールドを削除）
  console.log('Upsertを実行中（タイムスタンプなし）...');
  const { data: upsertData, error: upsertError } = await supabase
    .from('buyers')
    .upsert(mappedData, { onConflict: 'buyer_number' })
    .select();

  if (upsertError) {
    console.error('❌ Upsertエラー:');
    console.error('  コード:', upsertError.code);
    console.error('  メッセージ:', upsertError.message);
    console.error('  詳細:', upsertError.details);
    console.error('  ヒント:', upsertError.hint);
  } else {
    console.log('✓ Upsert成功！');
    console.log('結果:', JSON.stringify(upsertData, null, 2));
  }

  // 最終確認
  console.log('\n最終確認: データベースから買主6648を取得...');
  const { data: final, error: finalError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (finalError) {
    console.error('取得エラー:', finalError);
  } else if (final) {
    console.log('✓ 買主6648がデータベースに存在します');
    console.log('買主ID:', final.id);
    console.log('名前:', final.name);
    console.log('電話:', final.phone_number);
    console.log('物件番号:', final.property_number);
  } else {
    console.log('❌ 買主6648がデータベースに見つかりません');
  }
}

forceSyncBuyer6648().catch(console.error);
