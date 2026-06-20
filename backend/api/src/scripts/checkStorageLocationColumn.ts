// スプレッドシートの「保存場所」カラムを確認するスクリプト
import dotenv from 'dotenv';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

dotenv.config();

async function checkStorageLocationColumn() {
  console.log('🔍 Checking "保存場所" column in property spreadsheet...\n');
  
  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID!;
  const sheetName = process.env.PROPERTY_LISTING_SHEET_NAME || '物件';
  
  console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
  console.log(`📄 Sheet name: ${sheetName}\n`);
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });
  
  try {
    await sheetsClient.authenticate();
    
    // ヘッダー行を取得
    const headers = await sheetsClient.getHeaders();
    
    console.log(`📋 Total columns: ${headers.length}\n`);
    
    // 「保存場所」カラムを探す
    const storageLocationIndex = headers.findIndex(h => 
      h === '保存場所' || h === '格納先URL' || h.includes('保存') || h.includes('格納')
    );
    
    if (storageLocationIndex !== -1) {
      const columnName = headers[storageLocationIndex];
      const columnLetter = String.fromCharCode(65 + storageLocationIndex);
      
      console.log(`✅ Found storage location column:`);
      console.log(`   Column name: "${columnName}"`);
      console.log(`   Column index: ${storageLocationIndex}`);
      console.log(`   Column letter: ${columnLetter}\n`);
      
      // サンプルデータを取得（最初の10行）
      const allData = await sheetsClient.getAllData();
      const sampleData = allData.slice(0, 10);
      
      console.log(`📊 Sample data (first 10 rows):`);
      let withData = 0;
      let withoutData = 0;
      
      sampleData.forEach((row, index) => {
        const propertyNumber = row['物件番号'];
        const storageLocation = row[columnName];
        
        if (storageLocation && storageLocation.trim() !== '') {
          console.log(`   ✅ ${propertyNumber}: ${storageLocation.substring(0, 60)}...`);
          withData++;
        } else {
          console.log(`   ❌ ${propertyNumber}: (empty)`);
          withoutData++;
        }
      });
      
      console.log(`\n📊 Sample statistics:`);
      console.log(`   With data: ${withData}/10`);
      console.log(`   Without data: ${withoutData}/10`);
      
      // 全データの統計
      console.log(`\n📊 Checking all ${allData.length} rows...`);
      let totalWithData = 0;
      let totalWithoutData = 0;
      
      allData.forEach(row => {
        const storageLocation = row[columnName];
        if (storageLocation && storageLocation.trim() !== '') {
          totalWithData++;
        } else {
          totalWithoutData++;
        }
      });
      
      console.log(`\n📊 Full statistics:`);
      console.log(`   Total rows: ${allData.length}`);
      console.log(`   With storage_location: ${totalWithData} (${Math.round(totalWithData / allData.length * 100)}%)`);
      console.log(`   Without storage_location: ${totalWithoutData} (${Math.round(totalWithoutData / allData.length * 100)}%)`);
      
    } else {
      console.log('❌ Storage location column not found');
      console.log('\n📋 Available columns:');
      headers.forEach((header, index) => {
        const columnLetter = String.fromCharCode(65 + index);
        console.log(`   ${columnLetter}: ${header}`);
      });
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkStorageLocationColumn();
