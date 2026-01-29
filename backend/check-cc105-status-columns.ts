import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

async function checkCC105StatusColumns() {
  try {
    console.log('🔍 Checking CC105 status columns...\n');
    
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
    
    // スプレッドシートからデータを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:DX`, // 全列取得
    });
    
    const rows = response.data.values || [];
    const headers = rows[0];
    
    // 物件番号の列インデックスを探す
    const propertyNumberIndex = headers.findIndex((h: string) => h === '物件番号');
    
    // CC105を検索
    let cc105Row: any[] | null = null;
    let cc105RowNumber = -1;
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[propertyNumberIndex] === 'CC105') {
        cc105Row = row;
        cc105RowNumber = i + 1;
        break;
      }
    }
    
    if (!cc105Row) {
      console.log('❌ CC105 not found');
      return;
    }
    
    console.log(`✅ Found CC105 at row ${cc105RowNumber}\n`);
    
    // ステータス関連の列を確認
    const statusColumns = [
      'メール配信',
      '配信前確認',
      '配信日',
      '配信担当',
      '公開前確認',
      '公開予定日',
      '一般媒介のため配信不要、即公開'
    ];
    
    console.log('📋 Status-related columns for CC105:');
    console.log('═══════════════════════════════════════════════════════════');
    
    statusColumns.forEach(columnName => {
      const columnIndex = headers.findIndex((h: string) => h === columnName);
      if (columnIndex !== -1) {
        const value = cc105Row![columnIndex] || '(empty)';
        console.log(`   ${columnName}: "${value}"`);
      } else {
        console.log(`   ${columnName}: (column not found)`);
      }
    });
    
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    
    // メール配信の値を確認
    const mailDistributionIndex = headers.findIndex((h: string) => h === 'メール配信');
    const mailDistributionValue = cc105Row[mailDistributionIndex] || '';
    
    console.log('🔍 Analysis:');
    console.log(`   メール配信 value: "${mailDistributionValue}"`);
    console.log('');
    
    if (mailDistributionValue.includes('公開前配信不要、即　公開希望')) {
      console.log('✅ This property should be synced as "公開中"');
      console.log('   Reason: Contains "公開希望" (wants to be published)');
    } else if (mailDistributionValue.includes('配信不要')) {
      console.log('⚠️ This property has "配信不要" (no distribution needed)');
      console.log('   But it may still need to be published on the site');
    } else {
      console.log('❌ Status unclear from "メール配信" column');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('📝 ROOT CAUSE:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   1. The sync service expects an "atbb_status" column');
    console.log('   2. The spreadsheet uses "メール配信" instead');
    console.log('   3. CC105 has "公開前配信不要、即　公開希望（公開期日無視）"');
    console.log('   4. This value is NOT mapped to atbb_status in the sync service');
    console.log('');
    console.log('📝 Solution:');
    console.log('   Option 1: Add "atbb_status" column to spreadsheet and set to "公開中"');
    console.log('   Option 2: Update sync service to map "メール配信" values to atbb_status');
    console.log('   Option 3: Manually add CC105 to property_listings table');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkCC105StatusColumns();
