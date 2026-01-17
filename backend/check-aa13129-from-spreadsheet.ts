import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

async function checkAA13129FromSpreadsheet() {
  console.log('=== スプレッドシートからAA13129を確認 ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',  // 環境変数に合わせて修正
    serviceAccountKeyPath: 'google-service-account.json'
  });
  
  try {
    // 認証
    await sheetsClient.authenticate();
    
    // スプレッドシートから全データを取得
    const rows = await sheetsClient.readAll();
    
    // AA13129を検索
    const aa13129Row = rows.find((row: any) => row['物件番号'] === 'AA13129');
    
    if (!aa13129Row) {
      console.log('❌ スプレッドシートにAA13129が見つかりません');
      return;
    }
    
    console.log('✅ スプレッドシートでAA13129を発見');
    console.log('\n📋 スプレッドシートのデータ:');
    console.log('  物件番号:', aa13129Row['物件番号']);
    console.log('  保管場所:', aa13129Row['保管場所'] || '未設定');
    console.log('  Googleマップ:', aa13129Row['Googleマップ'] || '未設定');
    console.log('  画像URL:', aa13129Row['画像URL'] || '未設定');
    
    // 保管場所の詳細確認
    if (aa13129Row['保管場所']) {
      const storageLocation = String(aa13129Row['保管場所']);
      console.log('\n🔍 保管場所の詳細:');
      console.log('  値:', storageLocation);
      
      // フォルダIDを抽出
      const folderIdMatch = storageLocation.match(/folders\/([a-zA-Z0-9_-]+)/);
      if (folderIdMatch) {
        console.log('  フォルダID:', folderIdMatch[1]);
        console.log('  ✅ 有効なGoogle DriveフォルダURLです');
      } else {
        console.log('  ⚠️ Google DriveフォルダURLの形式ではありません');
      }
    } else {
      console.log('\n❌ スプレッドシートにも保管場所が設定されていません');
      console.log('⚠️ 新しくGoogle Driveフォルダを作成する必要があります');
    }
    
  } catch (error: any) {
    console.log('❌ エラー:', error.message);
  }
  
  console.log('\n=== 確認完了 ===');
}

checkAA13129FromSpreadsheet().catch(console.error);
