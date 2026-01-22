import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

async function checkAA13129FromGyomuList() {
  console.log('=== 業務リストからAA13129の格納先URLを確認 ===\n');

  // 業務リストのスプレッドシートID
  const gyomuSpreadsheetId = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
  const sheetName = '業務依頼';

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: gyomuSpreadsheetId,
    sheetName,
    serviceAccountKeyPath: './google-service-account.json'
  });
  
  try {
    // 認証
    await sheetsClient.authenticate();
    console.log('✅ 業務リストスプレッドシートに接続しました\n');
    
    // スプレッドシートから全データを取得
    const rows = await sheetsClient.readAll();
    console.log(`📊 ${sheetName}シートから ${rows.length} 件のデータを取得\n`);
    
    // 最初の行のキーを表示
    if (rows.length > 0) {
      console.log('利用可能なカラム:');
      Object.keys(rows[0]).forEach(key => {
        console.log(`  - ${key}`);
      });
      console.log('');
    }
    
    // AA13129を検索（物件番号カラムで）
    let aa13129Row = rows.find((row: any) => row['物件番号'] === 'AA13129');
    
    // 物件番号カラムで見つからない場合、全カラムを検索
    if (!aa13129Row) {
      console.log('物件番号カラムで見つからないため、全カラムを検索中...\n');
      aa13129Row = rows.find((row: any) => {
        return Object.values(row).some(value => 
          value && String(value).includes('AA13129')
        );
      });
    }
    
    if (!aa13129Row) {
      console.log('❌ 業務依頼シートにAA13129が見つかりません');
      console.log('⚠️ 物件番号の値を確認してください');
      return;
    }
    
    console.log('✅ AA13129が見つかりました！\n');
    console.log('📋 業務データ:');
    
    // 格納先URL関連のカラムを優先表示
    const storageKeys = Object.keys(aa13129Row).filter(key => 
      key.includes('格納') || 
      key.includes('保管') || 
      key.includes('URL') ||
      key.includes('Drive') ||
      key.includes('ドライブ') ||
      key.includes('フォルダ')
    );
    
    if (storageKeys.length > 0) {
      console.log('\n📁 格納先関連のカラム:');
      storageKeys.forEach(key => {
        const value = aa13129Row[key];
        console.log(`  ${key}: ${value || '(未設定)'}`);
        
        // URLが設定されている場合、フォルダIDを抽出
        if (value && String(value).includes('drive.google.com')) {
          const folderIdMatch = String(value).match(/folders\/([a-zA-Z0-9_-]+)/);
          if (folderIdMatch) {
            console.log(`    → フォルダID: ${folderIdMatch[1]}`);
          }
        }
      });
    }
    
    // 物件番号を表示
    console.log('\n🏠 物件情報:');
    const propertyKeys = ['物件番号', '物件所在地', '物件名', '依頼内容', '依頼者'];
    propertyKeys.forEach(key => {
      if (aa13129Row[key]) {
        console.log(`  ${key}: ${aa13129Row[key]}`);
      }
    });
    
    // 格納先URLを取得
    const storageUrl = storageKeys.length > 0 ? aa13129Row[storageKeys[0]] : null;
    
    if (storageUrl && String(storageUrl).includes('drive.google.com')) {
      console.log('\n✅ 格納先URLが見つかりました！');
      console.log(`URL: ${storageUrl}`);
      
      const folderIdMatch = String(storageUrl).match(/folders\/([a-zA-Z0-9_-]+)/);
      if (folderIdMatch) {
        console.log('\n💡 次のステップ:');
        console.log('  データベースのproperty_listingsテーブルを更新してください:');
        console.log('');
        console.log(`  UPDATE property_listings`);
        console.log(`  SET storage_location = '${storageUrl}'`);
        console.log(`  WHERE property_number = 'AA13129';`);
        console.log('');
        console.log('  または、修正スクリプトを実行:');
        console.log('  npx ts-node fix-aa13129-storage-location.ts');
      }
    } else {
      console.log('\n❌ 格納先URLが設定されていません');
      console.log('⚠️ マイドライブで「AA13129」フォルダを検索して、URLを設定してください');
    }
    
    // 全カラムデータを表示（デバッグ用）
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

checkAA13129FromGyomuList().catch(console.error);
