import dotenv from 'dotenv';
import { google } from 'googleapis';

dotenv.config();

async function checkCC21N1Only() {
  try {
    console.log('🔍 CC21のathomeシートのN1セルの値だけを取得中...\n');
    
    // 認証
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || 'google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // CC21のスプレッドシートID
    const spreadsheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    
    // N1セルの値だけを取得（valueRenderOption: 'UNFORMATTED_VALUE'を使用）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'athome!N1',
      valueRenderOption: 'UNFORMATTED_VALUE',
    });
    
    console.log('📊 取得したデータ:', JSON.stringify(response.data, null, 2));
    
    const values = response.data.values;
    
    if (values && values.length > 0 && values[0].length > 0) {
      const panoramaUrl = values[0][0];
      console.log('\n✅ N1セルの値:', panoramaUrl);
    } else {
      console.log('\n⚠️ N1セルが空です');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkCC21N1Only();
