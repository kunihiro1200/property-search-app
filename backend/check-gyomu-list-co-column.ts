/**
 * 業務依頼シートのCO列「格納先URL」を確認するスクリプト
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('🔍 業務依頼シートのCO列「格納先URL」を確認します...\n');

  try {
    // 業務依頼シートクライアントを初期化
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: process.env.GYOMU_LIST_SHEET_NAME || '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    });

    await gyomuListClient.authenticate();
    console.log('✅ 業務依頼シートに接続しました\n');

    // 全行を取得
    const rows = await gyomuListClient.readAll();
    console.log(`📊 合計行数: ${rows.length}\n`);

    // ヘッダー行を確認
    if (rows.length > 0) {
      console.log('📋 ヘッダー行（最初の行）:');
      const headers = Object.keys(rows[0]);
      headers.forEach((header, index) => {
        console.log(`  ${index + 1}. ${header}`);
      });
      console.log('');
    }

    // 「格納先URL」列が存在するか確認
    const hasStorageLocationColumn = rows.length > 0 && '格納先URL' in rows[0];
    console.log(`📋 「格納先URL」列が存在するか: ${hasStorageLocationColumn ? '✅ はい' : '❌ いいえ'}\n`);

    if (!hasStorageLocationColumn) {
      console.log('⚠️ 「格納先URL」列が見つかりません。');
      console.log('⚠️ 列名が異なる可能性があります。上記のヘッダー行を確認してください。');
      return;
    }

    // 最初の10件の物件番号と格納先URLを表示
    console.log('📋 最初の10件の物件番号と格納先URL:');
    console.log('─'.repeat(100));
    
    let count = 0;
    for (const row of rows) {
      if (count >= 10) break;
      
      const propertyNumber = row['物件番号'];
      const storageUrl = row['格納先URL'];
      
      if (propertyNumber) {
        console.log(`物件番号: ${propertyNumber}`);
        console.log(`格納先URL: ${storageUrl || '（空）'}`);
        
        // URL形式かチェック
        if (storageUrl) {
          const isValidUrl = String(storageUrl).startsWith('https://drive.google.com/drive/folders/');
          console.log(`URL形式: ${isValidUrl ? '✅ 有効' : '❌ 無効（パス形式の可能性）'}`);
        }
        
        console.log('─'.repeat(100));
        count++;
      }
    }

    // 統計情報
    console.log('\n📊 統計情報:');
    
    let totalProperties = 0;
    let withStorageUrl = 0;
    let withValidUrl = 0;
    let withInvalidUrl = 0;
    
    for (const row of rows) {
      const propertyNumber = row['物件番号'];
      if (!propertyNumber) continue;
      
      totalProperties++;
      
      const storageUrl = row['格納先URL'];
      if (storageUrl && String(storageUrl).trim() !== '') {
        withStorageUrl++;
        
        if (String(storageUrl).startsWith('https://drive.google.com/drive/folders/')) {
          withValidUrl++;
        } else {
          withInvalidUrl++;
        }
      }
    }
    
    console.log(`  合計物件数: ${totalProperties}`);
    console.log(`  格納先URLあり: ${withStorageUrl} (${((withStorageUrl / totalProperties) * 100).toFixed(1)}%)`);
    console.log(`  有効なURL形式: ${withValidUrl} (${((withValidUrl / totalProperties) * 100).toFixed(1)}%)`);
    console.log(`  無効なURL形式（パス形式など）: ${withInvalidUrl} (${((withInvalidUrl / totalProperties) * 100).toFixed(1)}%)`);
    console.log(`  格納先URLなし: ${totalProperties - withStorageUrl} (${(((totalProperties - withStorageUrl) / totalProperties) * 100).toFixed(1)}%)`);

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error);
  }
}

main();
