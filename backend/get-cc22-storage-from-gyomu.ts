import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function getCC22StorageFromGyomu() {
  console.log('🔍 Getting CC22 storage_location from 業務リスト...\n');

  // 業務リスト（業務依頼）スプレッドシートに接続
  const gyomuSheets = new GoogleSheetsClient({
    spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
    sheetName: '業務依頼',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await gyomuSheets.authenticate();

  // 全データを取得
  const rows = await gyomuSheets.readAll();
  console.log(`📋 Found ${rows.length} rows in 業務リスト`);

  // CC22を検索
  const cc22Row = rows.find(row => row['物件番号'] === 'CC22');

  if (!cc22Row) {
    console.log('❌ CC22 not found in 業務リスト');
    return;
  }

  console.log('✅ Found CC22 in 業務リスト!');
  console.log('格納先URL:', cc22Row['格納先URL'] || '(なし)');

  const storageUrl = cc22Row['格納先URL'];

  if (!storageUrl) {
    console.log('⚠️ 格納先URLが設定されていません');
    return;
  }

  // データベースを更新
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log('\n🔄 Updating database...');

  const { error } = await supabase
    .from('property_listings')
    .update({ storage_location: storageUrl })
    .eq('property_number', 'CC22');

  if (error) {
    console.error('❌ Error updating database:', error);
    return;
  }

  console.log('✅ Database updated successfully!');
  console.log('\nStorage Location:', storageUrl);
}

getCC22StorageFromGyomu().catch(console.error);
