/**
 * ローカル環境でgoogle-service-account.jsonを使って認証をテスト
 */
import * as dotenv from 'dotenv';
dotenv.config();

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function testLocalAuth() {
  console.log('🔍 Testing local authentication with google-service-account.json...');
  
  // 環境変数をクリア（serviceAccountKeyPathを優先させるため）
  delete process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  delete process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  delete process.env.GOOGLE_PRIVATE_KEY;
  
  // 物件リストスプレッドシートID
  const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  
  try {
    const client = new GoogleSheetsClient({
      spreadsheetId: spreadsheetId,
      sheetName: '物件',
      serviceAccountKeyPath: 'backend/google-service-account.json',
    });
    
    console.log('📝 Authenticating...');
    await client.authenticate();
    
    console.log('✅ Authentication successful!');
    
    // ヘッダーを取得してテスト
    console.log('📋 Fetching headers...');
    const headers = await client.getHeaders();
    console.log(`✅ Headers fetched: ${headers.length} columns`);
    console.log('First 10 headers:', headers.slice(0, 10));
    
  } catch (error: any) {
    console.error('❌ Authentication failed:', error.message);
    console.error('Error details:', error);
  }
}

testLocalAuth();
