import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function main() {
  console.log('🧪 単一レコードのマイグレーションテスト\n');

  // Google Sheets クライアントを初期化
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME!,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
  });

  await sheetsClient.authenticate();
  console.log('✅ 認証成功\n');

  // データを読み取り
  const rows = await sheetsClient.readAll();
  console.log(`📖 ${rows.length}行のデータを読み取りました\n`);

  // 最初の1件をテスト
  const testRow = rows[0];
  console.log('テストデータ:');
  console.log(JSON.stringify(testRow, null, 2));
  console.log('');

  // バリデーション
  const columnMapper = new ColumnMapper();
  const validation = columnMapper.validate(testRow);
  
  console.log('バリデーション結果:');
  console.log(`  有効: ${validation.isValid}`);
  if (!validation.isValid) {
    console.log(`  エラー: ${validation.errors.join(', ')}`);
  }
  console.log('');

  // データ変換
  const sellerData = columnMapper.mapToDatabase(testRow);
  console.log('変換後のデータ:');
  console.log(JSON.stringify(sellerData, null, 2));
  console.log('');

  // Supabaseに挿入
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data, error } = await supabase
    .from('sellers')
    .insert(sellerData as any)
    .select();

  if (error) {
    console.error('❌ データベースエラー:', error);
  } else {
    console.log('✅ 挿入成功:', data);
  }
}

main();
