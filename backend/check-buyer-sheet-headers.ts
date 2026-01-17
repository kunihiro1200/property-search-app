import { GoogleSheetsClient, GoogleSheetsConfig } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkBuyerSheetHeaders() {
  // 買主リストのスプレッドシートID
  const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  const sheetName = '買主リスト';
  
  const config: GoogleSheetsConfig = {
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
  };
  
  const client = new GoogleSheetsClient(config);
  
  try {
    console.log('Connecting to Google Sheets...');
    console.log(`Spreadsheet ID: ${spreadsheetId}`);
    console.log(`Sheet Name: ${sheetName}`);
    console.log('');
    
    await client.authenticate();
    
    // getSpreadsheetMetadataでシート情報を確認
    const metadata = await client.getSpreadsheetMetadata();
    console.log('Available sheets:');
    metadata.sheets?.forEach(sheet => {
      console.log(`  - ${sheet.properties?.title}`);
    });
    
    console.log('');
    console.log('Reading first row to get headers...');
    
    // 直接Google Sheets APIを使ってヘッダーを取得
    const { google } = require('googleapis');
    const fs = require('fs');
    const path = require('path');
    
    const keyPath = path.resolve(process.cwd(), config.serviceAccountKeyPath!);
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `'${sheetName}'!1:1`,
    });
    
    const headers = response.data.values?.[0] || [];
    console.log(`Total columns: ${headers.length}`);
    console.log('');
    console.log('=== Column Headers ===');
    
    headers.forEach((header: string, index: number) => {
      const colLetter = getColumnLetter(index);
      console.log(`${colLetter} (${index + 1}): ${header || '(empty)'}`);
    });
    
    console.log('');
    console.log('=== JSON Format for Column Mapping ===');
    const mapping: Record<string, string> = {};
    headers.forEach((header: string) => {
      if (header) {
        const dbColumn = toSnakeCase(header);
        mapping[header] = dbColumn;
      }
    });
    console.log(JSON.stringify(mapping, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

function toSnakeCase(str: string): string {
  // 日本語や特殊文字を含む場合はそのまま返す（後で手動マッピング）
  if (/[^\x00-\x7F]/.test(str)) {
    return str.toLowerCase().replace(/\s+/g, '_').replace(/[()（）]/g, '');
  }
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '')
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

checkBuyerSheetHeaders();
