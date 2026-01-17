import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixAA13154StorageLocation() {
  console.log('=== AA13154格納先URL修正 ===\n');

  try {
    // 1. Google Sheets API認証（サービスアカウントJSONファイルから）
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ サービスアカウントキーファイルが見つかりません: ${keyPath}`);
      return;
    }

    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    // 2. 業務依頼シートから直接CO275セルを取得
    const GYOMU_IRAI_SHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    
    console.log('業務依頼シートからCO275セルを取得中...');
    
    // CO275セルを直接取得（行275、列CO = 93列目）
    const range = '業務依頼!CO275';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: range,
    });

    const storageUrl = response.data.values?.[0]?.[0];
    
    console.log(`取得した格納先URL: ${storageUrl || '(空)'}`);

    if (!storageUrl) {
      console.log('⚠️ CO275セルが空です');
      return;
    }

    // 2. 現在のAA13154のデータを確認
    const { data: currentData, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'AA13154')
      .single();

    if (fetchError) {
      console.error('❌ AA13154の取得エラー:', fetchError);
      return;
    }

    console.log('\n現在のAA13154データ:');
    console.log('  property_number:', currentData.property_number);
    console.log('  storage_location:', currentData.storage_location);

    // 3. storage_locationを更新
    console.log('\nstorage_locationを更新中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        storage_location: storageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'AA13154');

    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }

    // 4. 更新後のデータを確認
    const { data: updatedData } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', 'AA13154')
      .single();

    console.log('\n✅ 更新完了！');
    console.log('\n更新後のAA13154データ:');
    console.log('  property_number:', updatedData?.property_number);
    console.log('  storage_location:', updatedData?.storage_location);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

fixAA13154StorageLocation();
