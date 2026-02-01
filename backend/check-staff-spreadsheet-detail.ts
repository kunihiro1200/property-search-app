/**
 * スタッフ管理スプレッドシートの詳細確認
 * W, M が通常スタッフかどうかを確認
 */

import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

const STAFF_SPREADSHEET_ID = '19yAuVYQRm-_zhjYX7M7zjiGbnBibkG77Mpz93sN1xxs';

async function checkStaffDetail() {
  console.log('=== スタッフ管理スプレッドシートの詳細確認 ===\n');
  
  try {
    // Google Sheets API認証
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    
    // スタッフシートからデータを取得（A:I列）
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: STAFF_SPREADSHEET_ID,
      range: 'スタッフ!A:I',
    });
    
    const rows = response.data.values || [];
    
    if (rows.length === 0) {
      console.log('❌ データが見つかりません');
      return;
    }
    
    // ヘッダー行を確認
    const headers = rows[0];
    console.log('📊 ヘッダー行:');
    headers.forEach((header, index) => {
      const colLetter = String.fromCharCode(65 + index);
      console.log(`  ${colLetter}列: ${header}`);
    });
    console.log('');
    
    // 全スタッフデータを表示
    console.log('📊 全スタッフデータ:');
    console.log('-'.repeat(80));
    console.log('イニシャル | 名字     | 姓名     | 有効   | 通常');
    console.log('-'.repeat(80));
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const initial = row[1] || ''; // B列（イニシャル）
      const lastName = row[2] || ''; // C列（名字）
      const fullName = row[3] || ''; // D列（姓名）
      const active = row[7] || ''; // H列（有効）
      const normal = row[8] || ''; // I列（通常）
      
      if (!initial && !lastName) continue;
      
      console.log(`${initial.padEnd(10)} | ${lastName.padEnd(8)} | ${fullName.padEnd(8)} | ${active.toString().padEnd(6)} | ${normal.toString()}`);
    }
    console.log('-'.repeat(80));
    
    // W, M を探す
    console.log('\n📍 W, M の確認:');
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const initial = row[1] || ''; // B列（イニシャル）
      const lastName = row[2] || ''; // C列（名字）
      const fullName = row[3] || ''; // D列（姓名）
      const active = row[7] || ''; // H列（有効）
      const normal = row[8] || ''; // I列（通常）
      
      if (initial === 'W' || initial === 'M' || initial === 'N' || initial === 'T') {
        console.log(`  ${initial}: 名字=${lastName}, 姓名=${fullName}, 有効=${active}, 通常=${normal}`);
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkStaffDetail();
