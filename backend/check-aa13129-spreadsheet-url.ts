/**
 * AA13129物件のスプレッドシートURL確認
 */

import { PropertyListingService } from './src/services/PropertyListingService';
import { WorkTaskService } from './src/services/WorkTaskService';
import dotenv from 'dotenv';

dotenv.config();

async function checkSpreadsheetUrl() {
  console.log('=== AA13129 スプレッドシートURL確認 ===\n');

  try {
    const propertyListingService = new PropertyListingService();
    const workTaskService = new WorkTaskService();

    // AA13129物件を検索
    console.log('AA13129物件を検索中...');
    const properties = await propertyListingService.searchByPropertyNumber('AA13129', true);

    if (properties.length === 0) {
      console.error('❌ AA13129物件が見つかりません');
      process.exit(1);
    }

    const property = properties[0];
    console.log('✅ AA13129物件が見つかりました\n');

    // property_listingsテーブルの情報
    console.log('【property_listingsテーブル】');
    console.log(`物件ID: ${property.id}`);
    console.log(`物件番号: ${property.property_number}`);
    console.log(`物件タイプ: ${property.property_type}`);
    console.log(`storage_location: ${property.storage_location || '(なし)'}`);
    console.log('');

    // work_tasksテーブルの情報
    console.log('【work_tasksテーブル】');
    const workTask = await workTaskService.getByPropertyNumber(property.property_number);
    
    if (workTask) {
      console.log(`storage_url: ${workTask.storage_url || '(なし)'}`);
      console.log(`spreadsheet_url: ${(workTask as any).spreadsheet_url || '(なし)'}`);
    } else {
      console.log('work_taskレコードが見つかりません');
    }
    console.log('');

    // 問題の診断
    console.log('【診断結果】');
    
    const storageLocation = property.storage_location;
    
    if (!storageLocation) {
      console.log('❌ storage_locationが設定されていません');
      console.log('   → お気に入り文言を取得できません');
    } else if (storageLocation.includes('/drive/folders/')) {
      console.log('⚠️  storage_locationがGoogle Driveフォルダです');
      console.log('   → スプレッドシートURLが必要です');
      console.log('');
      console.log('【解決策】');
      console.log('1. 業務リストスプレッドシートのURLを確認');
      console.log('2. property_listings.storage_locationをスプレッドシートURLに更新');
      console.log('   例: https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit');
      console.log('');
      console.log('または');
      console.log('');
      console.log('3. お気に入り文言機能の仕様を変更');
      console.log('   - 業務リストスプレッドシートIDを環境変数で設定');
      console.log('   - 物件番号から該当シートを特定');
    } else if (storageLocation.includes('/spreadsheets/d/')) {
      console.log('✅ storage_locationがスプレッドシートURLです');
      console.log('   → お気に入り文言を取得できます');
      console.log('');
      console.log('【次のステップ】');
      console.log('1. スプレッドシートの「athome」シートを確認');
      console.log('2. セルB142（戸建て）に文言を入力');
      console.log('3. フロントエンドで表示を確認');
    } else {
      console.log('⚠️  storage_locationの形式が不明です');
      console.log(`   URL: ${storageLocation}`);
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  process.exit(0);
}

checkSpreadsheetUrl();
