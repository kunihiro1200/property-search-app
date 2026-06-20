import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkCC6StorageUrl() {
  console.log('=== CC6 格納先URL確認 ===\n');

  // 1. property_listingsテーブルを確認
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: property, error } = await supabase
    .from('property_listings')
    .select('id, property_number, storage_location, athome_data')
    .eq('property_number', 'CC6')
    .single();

  if (error) {
    console.error('❌ Error fetching property:', error);
    return;
  }

  console.log('1. property_listingsテーブル:');
  console.log('   - property_number:', property.property_number);
  console.log('   - id:', property.id);
  console.log('   - storage_location:', property.storage_location || '(空)');
  console.log('   - athome_data:', property.athome_data || '(空)');
  console.log('');

  // 2. 業務リスト（業務依頼）を確認
  console.log('2. 業務リスト（業務依頼）スプレッドシート:');
  try {
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    const rows = await gyomuListClient.readAll();

    const cc6Row = rows.find(row => row['物件番号'] === 'CC6');

    if (cc6Row) {
      console.log('   ✅ CC6が見つかりました');
      console.log('   - 格納先URL:', cc6Row['格納先URL'] || '(空)');
      console.log('   - スプシURL:', cc6Row['スプシURL'] || '(空)');
    } else {
      console.log('   ❌ CC6が見つかりませんでした');
    }
  } catch (error: any) {
    console.error('   ❌ Error:', error.message);
  }

  console.log('');
  console.log('=== 結論 ===');
  if (!property.storage_location) {
    console.log('❌ CC6の格納先URLが設定されていません');
    console.log('');
    console.log('📝 対処方法:');
    console.log('1. Google DriveでCC6のフォルダを探す');
    console.log('2. フォルダのURLをコピー');
    console.log('3. 以下のいずれかに設定:');
    console.log('   - property_listingsテーブルのstorage_locationカラム');
    console.log('   - 業務リスト（業務依頼）の「格納先URL」カラム');
  } else {
    console.log('✅ storage_locationは設定されています');
    console.log('   しかし、画像が見つからない可能性があります');
  }
}

checkCC6StorageUrl().catch(console.error);
