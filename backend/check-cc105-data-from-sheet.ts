import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkCC105Data() {
  console.log('🔍 Checking CC105 data from property list spreadsheet...\n');

  const config = {
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: './google-service-account.json',
  };

  const client = new GoogleSheetsClient(config);
  await client.authenticate();

  // 全データを取得
  const rows = await client.readAll();
  
  // 空行を除外
  const nonEmptyRows = rows.filter(row => {
    const propertyNumber = row['物件番号'];
    return propertyNumber && String(propertyNumber).trim() !== '';
  });
  
  console.log(`📊 Total non-empty rows: ${nonEmptyRows.length}`);
  
  // CC105を検索
  const cc105 = nonEmptyRows.find(row => String(row['物件番号']) === 'CC105');
  
  if (!cc105) {
    console.log('❌ CC105 not found in spreadsheet');
    return;
  }
  
  console.log('✅ Found CC105 in spreadsheet\n');
  console.log('📋 CC105 data:');
  
  // 重要なフィールドを表示
  const importantFields = [
    '物件番号',
    '種別',
    '売買価格',
    '名前（買主）',
    '所在地',
    '住居表示（ATBB登録住所）',
    'atbb成約済み/非公開',
    '状況',
    '保存場所',
  ];
  
  importantFields.forEach(field => {
    const value = cc105[field];
    console.log(`  ${field}: ${value !== null && value !== undefined ? value : '(空)'}`);
  });
  
  console.log('\n📋 All fields:');
  Object.keys(cc105).forEach(key => {
    const value = cc105[key];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      console.log(`  ${key}: ${value}`);
    }
  });
}

checkCC105Data().catch(console.error);
