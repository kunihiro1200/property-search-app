import { google } from 'googleapis';
import * as path from 'path';

async function checkSheetNames() {
  console.log('📋 Checking sheet names in spreadsheet...\n');

  try {
    const keyPath = path.resolve(process.cwd(), 'google-service-account.json');
    
    const auth = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: [
        'https://www.googleapis.com/auth/spreadsheets',
        'https://www.googleapis.com/auth/drive.readonly'
      ],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    
    const response = await sheets.spreadsheets.get({
      spreadsheetId,
    });

    console.log('✅ Spreadsheet title:', response.data.properties?.title);
    console.log('\n📄 Available sheets:');
    
    response.data.sheets?.forEach((sheet, index) => {
      console.log(`  ${index + 1}. "${sheet.properties?.title}"`);
    });
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

checkSheetNames();
