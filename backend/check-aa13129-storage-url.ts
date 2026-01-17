import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

async function checkAA13129StorageUrl() {
  console.log('=== 売主リストシートからAA13129の格納先URLを確認 ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: 'google-service-account.json'
  });
  
  try {
    // 認証
    await sheetsClient.authenticate();
    console.log('✅ スプレッドシートに接続しました\n');
    
    // スプレッドシートから全データを取得
    const rows = await sheetsClient.readAll();
    console.log(`📊 売主リストシートから ${rows.length} 件のデータを取得\n`);
    
    // 最初の行のキーを表示
    if (rows.length > 0) {
      console.log('利用可能なカラム:');
      Object.keys(rows[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
      console.log('');
    }
    
    // AA13129を検索
    const aa13129Row = rows.find((row: any) => row['物件番号'] === 'AA13129');
    
    if (!aa13129Row) {
      console.log('❌ 売主リストシートにAA13129が見つかりません');
      console.log('⚠️ 物件番号カラムの値を確認してください');
      return;
    }
    
    console.log('✅ AA13129が見つかりました！\n');
    console.log('📋 物件データ:');
    console.log('  物件番号:', aa13129Row['物件番号']);
    console.log('  格納先URL:', aa13129Row['格納先URL'] || '(未設定)');
    console.log('  保管場所:', aa13129Row['保管場所'] || '(未設定)');
    
    // 格納先URLの詳細確認
    const storageUrl = aa13129Row['格納先URL'] || aa13129Row['保管場所'];
    
    if (storageUrl) {
      console.log('\n🔍 格納先URLの詳細:');
      console.log('  値:', storageUrl);
      
      // フォルダIDを抽出
      const folderIdMatch = String(storageUrl).match(/folders\/([a-zA-Z0-9_-]+)/);
      if (folderIdMatch) {
        const folderId = folderIdMatch[1];
        console.log('  フォルダID:', folderId);
        console.log('  ✅ 有効なGoogle DriveフォルダURLです');
        console.log('\n💡 次のステップ:');
        console.log(`  1. データベースのproperty_listingsテーブルを更新:`);
        console.log(`     UPDATE property_listings`);
        console.log(`     SET storage_location = '${storageUrl}'`);
        console.log(`     WHERE property_number = 'AA13129';`);
      } else {
        console.log('  ⚠️ Google DriveフォルダURLの形式ではありません');
      }
    } else {
      console.log('\n❌ スプレッドシートにも格納先URLが設定されていません');
      console.log('⚠️ 以下の方法で確認してください:');
      console.log('  1. マイドライブで「AA13129」という名前のフォルダを検索');
      console.log('  2. フォルダが見つかったら、そのURLを取得');
      console.log('  3. スプレッドシートの「格納先URL」カラムに設定');
    }
    
    // 全カラムデータを表示
    console.log('\n📝 全カラムデータ:');
    Object.entries(aa13129Row).forEach(([key, value]) => {
      if (value !== null && value !== '') {
        console.log(`  ${key}: ${value}`);
      }
    });
    
  } catch (error: any) {
    console.log('❌ エラー:', error.message);
    console.error(error);
  }
  
  console.log('\n=== 確認完了 ===');
}

checkAA13129StorageUrl().catch(console.error);
