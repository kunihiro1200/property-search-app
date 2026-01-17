/**
 * AA18物件のstorage_location設定スクリプト
 * 
 * 目的:
 * - スプレッドシートからAA18の格納先URLを取得
 * - データベースのstorage_locationに設定
 * - 設定後の動作確認
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyImageService } from './src/services/PropertyImageService';

config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  console.log('🔧 AA18物件のstorage_location設定を開始します...\n');
  console.log('='.repeat(80) + '\n');

  try {
    // Step 1: スプレッドシートからAA18の格納先URLを取得
    console.log('📋 Step 1: スプレッドシートからAA18の格納先URLを取得中...\n');
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: '売主リスト',
      serviceAccountKeyPath: 'google-service-account.json'
    });
    
    await sheetsClient.authenticate();
    console.log('✅ スプレッドシートに接続しました');
    
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length}件のデータを取得しました`);
    
    // AA18を検索
    const aa18Row = rows.find((row: any) => row['物件番号'] === 'AA18');
    
    if (!aa18Row) {
      console.log('\n❌ スプレッドシートにAA18が見つかりません');
      console.log('\n💡 手動で設定する場合:');
      console.log('   1. Google DriveでAA18のフォルダを探す');
      console.log('   2. フォルダURLをコピー');
      console.log('   3. 以下のSQLを実行:');
      console.log('      UPDATE property_listings');
      console.log('      SET storage_location = \'YOUR_FOLDER_URL\'');
      console.log('      WHERE property_number = \'AA18\';');
      return;
    }
    
    console.log('\n✅ AA18をスプレッドシートで発見しました');
    
    // 格納先URLを取得（複数のカラム名に対応）
    const storageUrlRaw = aa18Row['格納先URL'] || aa18Row['保管場所'] || aa18Row['storage_url'];
    const storageUrl = storageUrlRaw ? String(storageUrlRaw) : null;
    
    if (!storageUrl) {
      console.log('\n❌ スプレッドシートにも格納先URLが設定されていません');
      console.log('\n💡 対応方法:');
      console.log('   1. Google DriveでAA18のフォルダを探す');
      console.log('   2. フォルダURLをスプレッドシートの「格納先URL」カラムに設定');
      console.log('   3. このスクリプトを再実行');
      return;
    }
    
    console.log(`   格納先URL: ${storageUrl}`);
    
    // フォルダIDを検証
    const folderIdMatch = String(storageUrl).match(/folders\/([a-zA-Z0-9_-]+)/);
    if (!folderIdMatch) {
      console.log('\n⚠️ 格納先URLの形式が正しくありません');
      console.log(`   現在の値: ${storageUrl}`);
      console.log('   正しい形式: https://drive.google.com/drive/folders/FOLDER_ID');
      return;
    }
    
    const folderId = folderIdMatch[1];
    console.log(`   フォルダID: ${folderId}`);
    console.log('   ✅ 有効なGoogle DriveフォルダURLです');

    // Step 2: データベースのstorage_locationを更新
    console.log('\n\n' + '='.repeat(80));
    console.log('💾 Step 2: データベースのstorage_locationを更新中...\n');
    
    const { data: updateResult, error: updateError } = await supabase
      .from('property_listings')
      .update({ storage_location: storageUrl })
      .eq('property_number', 'AA18')
      .select();
    
    if (updateError) {
      console.error('❌ 更新エラー:', updateError.message);
      return;
    }
    
    if (!updateResult || updateResult.length === 0) {
      console.log('❌ AA18物件が見つかりませんでした');
      console.log('   property_listingsテーブルにAA18が存在するか確認してください');
      return;
    }
    
    console.log('✅ storage_locationを更新しました');
    console.log(`   物件番号: ${updateResult[0].property_number}`);
    console.log(`   storage_location: ${updateResult[0].storage_location}`);

    // Step 3: 画像取得テスト
    console.log('\n\n' + '='.repeat(80));
    console.log('🧪 Step 3: 画像取得テスト中...\n');
    
    const imageService = new PropertyImageService();
    const result = await imageService.getImagesFromStorageUrl(storageUrl);
    
    console.log('✅ 画像取得テスト完了');
    console.log(`   取得した画像数: ${result.images.length}`);
    console.log(`   使用されたフォルダID: ${result.folderId}`);
    
    if (result.images.length > 0) {
      console.log('\n📸 取得した画像:');
      result.images.slice(0, 5).forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.name}`);
        console.log(`      ID: ${img.id}`);
        console.log(`      サイズ: ${(img.size / 1024 / 1024).toFixed(2)} MB`);
      });
      
      if (result.images.length > 5) {
        console.log(`   ... 他 ${result.images.length - 5} 枚`);
      }
    } else {
      console.log('\n⚠️ 画像が見つかりませんでした');
      console.log('   フォルダに画像が存在するか確認してください');
    }

    // Step 4: 完了サマリー
    console.log('\n\n' + '='.repeat(80));
    console.log('✅ 設定完了サマリー');
    console.log('='.repeat(80) + '\n');
    
    console.log('✅ AA18のstorage_locationを設定しました');
    console.log(`   格納先URL: ${storageUrl}`);
    console.log(`   フォルダID: ${folderId}`);
    console.log(`   画像数: ${result.images.length}枚`);
    
    console.log('\n📋 次のステップ:');
    console.log('   1. バックエンドを再起動（キャッシュクリア）');
    console.log('   2. 公開物件サイトでAA18を確認');
    console.log('   3. 画像が正しく表示されることを確認');
    
    if (result.images.length === 0) {
      console.log('\n⚠️ 注意: 画像が見つかりませんでした');
      console.log('   以下を確認してください:');
      console.log('   1. Google Driveフォルダに画像が存在するか');
      console.log('   2. サービスアカウントにフォルダへのアクセス権限があるか');
      console.log('   3. 画像ファイルの形式（JPEG, PNG, GIFなど）');
    }

  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

main();
