import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function diagnoseCC105SyncIssue() {
  try {
    console.log('🔍 Diagnosing CC105 sync issue...\n');
    
    // Google Sheets APIの認証
    const serviceAccountPath = path.join(__dirname, 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
    const sheetName = process.env.GYOMU_LIST_SHEET_NAME || '業務依頼';
    
    console.log(`📋 Reading from spreadsheet: ${spreadsheetId}`);
    console.log(`📄 Sheet name: ${sheetName}\n`);
    
    // スプレッドシートからデータを取得（全列）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:ZZ1`, // ヘッダー行のみ、全列取得
    });
    
    const headers = response.data.values?.[0] || [];
    
    console.log('📋 All column headers:');
    console.log('═══════════════════════════════════════════════════════════');
    headers.forEach((header: string, index: number) => {
      const columnLetter = String.fromCharCode(65 + Math.floor(index / 26) - 1) + 
                          String.fromCharCode(65 + (index % 26));
      console.log(`   ${columnLetter.replace('@', '')}: ${header}`);
    });
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    // atbb_statusに関連する列を探す
    console.log('🔍 Searching for atbb_status related columns...\n');
    
    const atbbRelatedColumns = headers
      .map((header: string, index: number) => ({ header, index }))
      .filter(({ header }: { header: string }) => 
        header && (
          header.toLowerCase().includes('atbb') ||
          header.includes('ステータス') ||
          header.includes('状態') ||
          header.includes('公開') ||
          header.includes('配信')
        )
      );
    
    if (atbbRelatedColumns.length > 0) {
      console.log('✅ Found atbb_status related columns:');
      atbbRelatedColumns.forEach(({ header, index }: { header: string; index: number }) => {
        const columnLetter = String.fromCharCode(65 + Math.floor(index / 26) - 1) + 
                            String.fromCharCode(65 + (index % 26));
        console.log(`   ${columnLetter.replace('@', '')}: ${header}`);
      });
    } else {
      console.log('❌ No atbb_status related columns found!');
      console.log('');
      console.log('📝 This is the problem:');
      console.log('   1. The sync service expects an "atbb_status" column');
      console.log('   2. Without this column, properties cannot be synced');
      console.log('   3. CC105 exists in the spreadsheet but has no status column');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📊 Diagnosis Summary:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   Total columns: ${headers.length}`);
    console.log(`   atbb_status related columns: ${atbbRelatedColumns.length}`);
    console.log('');
    
    if (atbbRelatedColumns.length === 0) {
      console.log('❌ ROOT CAUSE IDENTIFIED:');
      console.log('   The spreadsheet does NOT have an atbb_status column');
      console.log('');
      console.log('📝 Solution:');
      console.log('   1. Add an "atbb_status" column to the spreadsheet');
      console.log('   2. Set the value to "公開中", "公開前", or "非公開（配信メールのみ）"');
      console.log('   3. Re-run the sync service');
      console.log('');
      console.log('⚠️ Alternative:');
      console.log('   If the spreadsheet uses a different column name for status,');
      console.log('   update the sync service to use that column name instead.');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

diagnoseCC105SyncIssue();
