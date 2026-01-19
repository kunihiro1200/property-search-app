import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function syncAllStorageLocations() {
  console.log('🔄 Syncing all storage_locations from 業務リスト to database...\n');

  // 業務リスト（業務依頼）スプレッドシートに接続
  const gyomuSheets = new GoogleSheetsClient({
    spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
    sheetName: '業務依頼',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await gyomuSheets.authenticate();

  // 全データを取得
  const rows = await gyomuSheets.readAll();
  console.log(`📋 Found ${rows.length} rows in 業務リスト\n`);

  // データベースに接続
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // 各行を処理
  for (const row of rows) {
    const propertyNumber = row['物件番号'];
    const storageUrl = row['格納先URL'];

    if (!propertyNumber) {
      continue; // 物件番号がない行はスキップ
    }

    if (!storageUrl) {
      skippedCount++;
      continue; // 格納先URLがない行はスキップ
    }

    try {
      // データベースを更新
      const { error } = await supabase
        .from('property_listings')
        .update({ storage_location: storageUrl })
        .eq('property_number', propertyNumber);

      if (error) {
        console.error(`❌ Error updating ${propertyNumber}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Updated ${propertyNumber}`);
        updatedCount++;
      }
    } catch (error: any) {
      console.error(`❌ Error updating ${propertyNumber}:`, error.message);
      errorCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped (no storage URL): ${skippedCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`\n✅ Sync completed!`);
}

syncAllStorageLocations().catch(console.error);
