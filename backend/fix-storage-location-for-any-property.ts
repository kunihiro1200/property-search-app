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

/**
 * 任意の物件番号の格納先URLを業務依頼シートから取得して修正する汎用スクリプト
 * 
 * 使用方法:
 *   npx ts-node fix-storage-location-for-any-property.ts AA13154
 *   npx ts-node fix-storage-location-for-any-property.ts AA13129 AA13149
 */
async function fixStorageLocationForProperty(propertyNumber: string) {
  console.log(`\n=== ${propertyNumber}の格納先URL修正 ===\n`);

  try {
    // 1. Google Sheets API認証
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ サービスアカウントキーファイルが見つかりません: ${keyPath}`);
      return false;
    }

    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const GYOMU_IRAI_SHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    
    // 2. 物件番号列（A列）から該当物件の行番号を検索
    console.log('📋 業務依頼シートから物件を検索中...');
    
    const propertyNumberResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: '業務依頼!A:A',
    });

    const propertyNumbers = propertyNumberResponse.data.values || [];
    const rowIndex = propertyNumbers.findIndex(row => row[0] === propertyNumber);
    
    if (rowIndex === -1) {
      console.log(`❌ ${propertyNumber}が業務依頼シートに見つかりません`);
      return false;
    }

    const rowNumber = rowIndex + 1; // 1-based row number
    console.log(`✅ ${propertyNumber}を行${rowNumber}で発見`);

    // 3. CO列（格納先URL）を取得
    console.log('📁 格納先URLを取得中...');
    
    const cellRange = `業務依頼!CO${rowNumber}`;
    const cellResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: cellRange,
    });

    const storageUrl = cellResponse.data.values?.[0]?.[0];
    
    if (!storageUrl) {
      console.log(`⚠️ CO${rowNumber}セルが空です（格納先URLなし）`);
      return false;
    }

    console.log(`✅ 格納先URL取得: ${storageUrl}`);

    // 4. 現在のデータベースの値を確認
    const { data: currentData, error: fetchError } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    if (fetchError) {
      console.error(`❌ ${propertyNumber}の取得エラー:`, fetchError.message);
      return false;
    }

    console.log('\n現在のデータベース値:');
    console.log(`  storage_location: ${currentData.storage_location || '(NULL)'}`);

    // 既に正しい値が設定されている場合はスキップ
    if (currentData.storage_location === storageUrl) {
      console.log('\n✅ 既に正しい値が設定されています（更新不要）');
      return true;
    }

    // 5. storage_locationを更新
    console.log('\n📝 storage_locationを更新中...');
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        storage_location: storageUrl,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', propertyNumber);

    if (updateError) {
      console.error('❌ 更新エラー:', updateError.message);
      return false;
    }

    // 6. 更新後のデータを確認
    const { data: updatedData } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    console.log('\n✅ 更新完了！');
    console.log('\n更新後の値:');
    console.log(`  storage_location: ${updatedData?.storage_location}`);

    return true;

  } catch (error) {
    console.error('❌ エラー:', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('使用方法:');
    console.log('  npx ts-node fix-storage-location-for-any-property.ts <物件番号1> [物件番号2] ...');
    console.log('\n例:');
    console.log('  npx ts-node fix-storage-location-for-any-property.ts AA13154');
    console.log('  npx ts-node fix-storage-location-for-any-property.ts AA13129 AA13149');
    process.exit(1);
  }

  console.log('=== 格納先URL一括修正スクリプト ===');
  console.log(`対象物件数: ${args.length}\n`);

  const results: { [key: string]: boolean } = {};

  for (const propertyNumber of args) {
    const success = await fixStorageLocationForProperty(propertyNumber);
    results[propertyNumber] = success;
  }

  // サマリー
  console.log('\n\n=== 修正結果サマリー ===\n');
  
  const successCount = Object.values(results).filter(r => r).length;
  const failCount = Object.values(results).filter(r => !r).length;

  for (const [propertyNumber, success] of Object.entries(results)) {
    console.log(`${success ? '✅' : '❌'} ${propertyNumber}`);
  }

  console.log(`\n成功: ${successCount}件`);
  console.log(`失敗: ${failCount}件`);
}

main();
