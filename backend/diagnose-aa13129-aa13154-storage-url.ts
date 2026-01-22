// AA13129とAA13154の格納先URL転記問題の診断スクリプト
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseStorageUrlDiscrepancy() {
  console.log('=== AA13129 vs AA13154 格納先URL転記問題の診断 ===\n');

  const propertyNumbers = ['AA13129', 'AA13154'];

  // 1. スプレッドシートから両物件のデータを取得
  console.log('📊 ステップ1: スプレッドシートからデータを取得\n');
  
  const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  const PROPERTY_LIST_SHEET_NAME = '物件業務リスト';

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
    sheetName: PROPERTY_LIST_SHEET_NAME,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 
      'C:/Users/kunih/Downloads/seller-management-personal-618a08796d49.json'
  });

  try {
    // 認証
    await sheetsClient.authenticate();
    
    // データを取得
    const sheetRows = await sheetsClient.readAll();

    console.log(`📋 スプレッドシートから ${sheetRows.length} 行のデータを取得しました\n`);

    // 各物件のスプレッドシートデータを取得
    for (const propertyNumber of propertyNumbers) {
      const row = sheetRows.find((r: any) => r['物件番号'] === propertyNumber);
      
      console.log(`\n🔍 ${propertyNumber} - スプレッドシートデータ:`);
      if (row) {
        const storageLocation = row['保存場所'];
        console.log(`  ✅ 物件番号: ${row['物件番号']}`);
        console.log(`  📁 保存場所: ${storageLocation || '(空欄)'}`);
        console.log(`  📝 保存場所の型: ${typeof storageLocation}`);
        console.log(`  📏 保存場所の長さ: ${storageLocation ? String(storageLocation).length : 0}`);
      } else {
        console.log(`  ❌ スプレッドシートに見つかりません`);
      }
    }

    // 2. sellersテーブルから両物件のデータを取得
    console.log('\n\n📊 ステップ2: sellersテーブルからデータを取得\n');

    for (const propertyNumber of propertyNumbers) {
      const { data: seller, error } = await supabase
        .from('sellers')
        .select('property_number, storage_url, storage_location')
        .eq('property_number', propertyNumber)
        .single();

      console.log(`\n🔍 ${propertyNumber} - sellersテーブル:`);
      if (error) {
        console.log(`  ❌ エラー: ${error.message}`);
      } else if (seller) {
        console.log(`  ✅ 物件番号: ${seller.property_number}`);
        console.log(`  📁 storage_url: ${seller.storage_url || '(NULL)'}`);
        console.log(`  📁 storage_location: ${seller.storage_location || '(NULL)'}`);
      } else {
        console.log(`  ❌ データが見つかりません`);
      }
    }

    // 3. property_listingsテーブルから両物件のデータを取得
    console.log('\n\n📊 ステップ3: property_listingsテーブルからデータを取得\n');

    for (const propertyNumber of propertyNumbers) {
      const { data: listing, error } = await supabase
        .from('property_listings')
        .select('property_number, storage_url, storage_location')
        .eq('property_number', propertyNumber)
        .single();

      console.log(`\n🔍 ${propertyNumber} - property_listingsテーブル:`);
      if (error) {
        console.log(`  ❌ エラー: ${error.message}`);
      } else if (listing) {
        console.log(`  ✅ 物件番号: ${listing.property_number}`);
        console.log(`  📁 storage_url: ${listing.storage_url || '(NULL)'}`);
        console.log(`  📁 storage_location: ${listing.storage_location || '(NULL)'}`);
      } else {
        console.log(`  ❌ データが見つかりません`);
      }
    }

    // 4. カラムマッピングの確認
    console.log('\n\n📊 ステップ4: カラムマッピングの確認\n');
    console.log('📋 property-listing-column-mapping.json:');
    console.log('  - スプレッドシート「保存場所」→ データベース「storage_location」');
    console.log('\n📋 PropertyListingSyncService.ts:');
    console.log('  - seller.storage_url → property_listings.storage_url');
    console.log('\n⚠️  不一致の可能性:');
    console.log('  - スプレッドシート同期: 「保存場所」→「storage_location」');
    console.log('  - PropertyListingSyncService: 「storage_url」を使用');

    // 5. 結論と推奨事項
    console.log('\n\n📊 ステップ5: 診断結果と推奨事項\n');
    console.log('🔍 調査結果:');
    console.log('  1. スプレッドシートの「保存場所」カラムは「storage_location」にマッピングされている');
    console.log('  2. PropertyListingSyncServiceは「storage_url」フィールドを使用している');
    console.log('  3. この不一致により、AA13154のstorage_urlが転記されていない可能性がある');
    console.log('\n💡 推奨事項:');
    console.log('  1. sellersテーブルのstorage_locationとstorage_urlの関係を確認');
    console.log('  2. スプレッドシート同期時にstorage_urlが正しく設定されているか確認');
    console.log('  3. PropertyListingSyncServiceのマッピングを修正する必要があるか検討');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

diagnoseStorageUrlDiscrepancy();
