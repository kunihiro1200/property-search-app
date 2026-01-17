/**
 * AA13226 業務リストデータ確認・同期
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { WorkTaskSyncService } from './src/services/WorkTaskSyncService';

async function checkAA13226WorkTask() {
  console.log('=== AA13226 業務リストデータ確認 ===\n');

  try {
    const syncService = new WorkTaskSyncService();
    
    // 1. 現在のwork_tasksテーブルのデータを確認
    console.log('📊 work_tasksテーブルからAA13226を検索中...');
    const existingData = await syncService.getByPropertyNumber('AA13226');
    
    if (existingData) {
      console.log('✅ work_tasksテーブルにAA13226が存在します\n');
      console.log('現在のデータ:');
      console.log(`  物件番号: ${existingData.property_number}`);
      console.log(`  格納先URL: ${existingData.storage_url || '(未設定)'}`);
      console.log(`  物件所在: ${existingData.property_address || '(未設定)'}`);
      console.log(`  売主: ${existingData.seller_name || '(未設定)'}`);
      console.log(`  種別: ${existingData.property_type || '(未設定)'}`);
      console.log(`  最終同期日時: ${existingData.synced_at || '(未同期)'}`);
    } else {
      console.log('❌ work_tasksテーブルにAA13226が見つかりません');
    }

    // 2. スプレッドシートから最新データを同期
    console.log('\n📥 スプレッドシートから最新データを同期中...');
    const syncedData = await syncService.syncByPropertyNumber('AA13226');
    
    if (syncedData) {
      console.log('✅ 同期成功\n');
      console.log('同期後のデータ:');
      console.log(`  物件番号: ${syncedData.property_number}`);
      console.log(`  格納先URL: ${syncedData.storage_url || '(未設定)'}`);
      console.log(`  物件所在: ${syncedData.property_address || '(未設定)'}`);
      console.log(`  売主: ${syncedData.seller_name || '(未設定)'}`);
      console.log(`  種別: ${syncedData.property_type || '(未設定)'}`);
      console.log(`  同期日時: ${syncedData.synced_at}`);

      if (!syncedData.storage_url) {
        console.log('\n❌ 格納先URLがスプレッドシートにも設定されていません');
        console.log('\n💡 解決策:');
        console.log('  1. 業務リストスプレッドシートを開く');
        console.log('     URL: https://docs.google.com/spreadsheets/d/1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g');
        console.log('  2. 「業務依頼」シートのAA13226行を探す');
        console.log('  3. CO列「格納先URL」にGoogle DriveのフォルダURLを入力');
        console.log('  4. このスクリプトを再実行して同期');
      } else {
        console.log('\n✅ 格納先URLが設定されています');
        console.log(`  URL: ${syncedData.storage_url}`);
        console.log('\n次のステップ:');
        console.log('  property_listings.storage_locationにこのURLをコピーする必要があります');
        console.log('  fix-aa13226-storage-location.ts を実行してください');
      }
    } else {
      console.log('❌ 同期失敗');
      console.log('\n考えられる原因:');
      console.log('  1. スプレッドシートにAA13226が存在しない');
      console.log('  2. Google認証の問題');
      console.log('  3. スプレッドシートIDまたはシート名が間違っている');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('確認完了\n');
}

// 実行
checkAA13226WorkTask()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
