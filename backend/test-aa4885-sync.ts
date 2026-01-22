// AA4885の同期をテスト
import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { createClient } from '@supabase/supabase-js';

config();

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function testAA4885Sync() {
  console.log('🔍 AA4885の同期をテスト中...\n');
  console.log('='.repeat(80));
  
  try {
    // 1. スプレッドシートからAA4885を取得
    console.log('📥 Step 1: スプレッドシートからAA4885を取得');
    console.log('-'.repeat(80));
    
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allData = await sheetsClient.readAll();
    const aa4885Row = allData.find(row => {
      const propertyNumber = String(row['物件番号'] || '').trim();
      return propertyNumber === 'AA4885';
    });
    
    if (!aa4885Row) {
      console.log('❌ AA4885がスプレッドシートに見つかりません');
      return;
    }
    
    console.log('✅ AA4885が見つかりました');
    console.log(`  atbb成約済み/非公開: ${aa4885Row['atbb成約済み/非公開'] || '(空)'}`);
    
    // 2. データベースからAA4885を取得
    console.log('\n📊 Step 2: データベースからAA4885を取得');
    console.log('-'.repeat(80));
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: dbData, error } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, updated_at')
      .eq('property_number', 'AA4885')
      .single();
    
    if (error || !dbData) {
      console.log('❌ AA4885がデータベースに見つかりません');
      return;
    }
    
    console.log('✅ AA4885が見つかりました');
    console.log(`  atbb_status: ${dbData.atbb_status || '(null)'}`);
    console.log(`  updated_at: ${dbData.updated_at}`);
    
    // 3. 変更検出をテスト
    console.log('\n🔍 Step 3: 変更検出をテスト');
    console.log('-'.repeat(80));
    
    const syncService = new PropertyListingSyncService(sheetsClient);
    const updates = await syncService.detectUpdatedPropertyListings();
    
    console.log(`📊 検出された更新: ${updates.length}件`);
    
    const aa4885Update = updates.find(u => u.property_number === 'AA4885');
    
    if (aa4885Update) {
      console.log('\n✅ AA4885の更新が検出されました！');
      console.log('\n📋 変更されたフィールド:');
      for (const [field, change] of Object.entries(aa4885Update.changed_fields)) {
        console.log(`  ${field}:`);
        console.log(`    旧: ${change.old}`);
        console.log(`    新: ${change.new}`);
      }
    } else {
      console.log('\n❌ AA4885の更新が検出されませんでした');
      console.log('\n💡 デバッグ情報:');
      console.log(`  スプレッドシートの値: "${aa4885Row['atbb成約済み/非公開']}"`);
      console.log(`  データベースの値: "${dbData.atbb_status}"`);
      console.log(`  正規化後の比較が必要です`);
    }
    
    // 4. 手動で同期を実行
    console.log('\n🔄 Step 4: 手動で同期を実行');
    console.log('-'.repeat(80));
    
    const result = await syncService.syncUpdatedPropertyListings();
    
    console.log('\n📊 同期結果:');
    console.log(`  総数: ${result.total}`);
    console.log(`  更新: ${result.updated}`);
    console.log(`  失敗: ${result.failed}`);
    console.log(`  所要時間: ${result.duration_ms}ms`);
    
    if (result.errors && result.errors.length > 0) {
      console.log('\n❌ エラー:');
      result.errors.forEach(err => {
        console.log(`  ${err.property_number}: ${err.error}`);
      });
    }
    
    // 5. 同期後のデータベースを確認
    console.log('\n📊 Step 5: 同期後のデータベースを確認');
    console.log('-'.repeat(80));
    
    const { data: updatedData } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, updated_at')
      .eq('property_number', 'AA4885')
      .single();
    
    if (updatedData) {
      console.log('✅ AA4885の最新データ:');
      console.log(`  atbb_status: ${updatedData.atbb_status || '(null)'}`);
      console.log(`  updated_at: ${updatedData.updated_at}`);
      
      if (updatedData.atbb_status === aa4885Row['atbb成約済み/非公開']) {
        console.log('\n🎉 同期成功！データベースが更新されました！');
      } else {
        console.log('\n⚠️  値が一致しません');
        console.log(`  期待値: ${aa4885Row['atbb成約済み/非公開']}`);
        console.log(`  実際値: ${updatedData.atbb_status}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

testAA4885Sync()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ テストエラー:', error);
    process.exit(1);
  });
