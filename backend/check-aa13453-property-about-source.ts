/**
 * AA13453の「こちらの物件について」の取得元を確認
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyAboutSource() {
  console.log('🔍 Checking property_about source for AA13453...\n');

  // 1. データベースの現在の値を確認
  console.log('📊 Step 1: Check current database value');
  console.log('─'.repeat(60));
  
  const { data: dbData, error: dbError } = await supabase
    .from('property_details')
    .select('property_number, property_about')
    .eq('property_number', 'AA13453')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    return;
  }

  console.log('Current database value:');
  console.log(`  property_about: ${dbData.property_about || 'null'}`);
  console.log('');

  // 2. 物件スプレッドシート（優先）から取得
  console.log('📊 Step 2: Check property spreadsheet (PRIORITY SOURCE)');
  console.log('─'.repeat(60));
  
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const fs = require('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const propertySpreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  
  try {
    // 物件シートから全データを取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: propertySpreadsheetId,
      range: '物件!A:BQ', // A列からBQ列まで
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    // 物件番号列とBQ列のインデックスを探す
    const propertyNumberIndex = headers.findIndex((h: string) => h === '物件番号');
    const propertyAboutIndex = headers.findIndex((h: string) => h === '●内覧前伝達事項');
    
    console.log(`物件番号列: ${propertyNumberIndex} (${headers[propertyNumberIndex]})`);
    console.log(`●内覧前伝達事項列: ${propertyAboutIndex} (${headers[propertyAboutIndex]})`);
    console.log('');
    
    // AA13453を検索
    let found = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[propertyNumberIndex] === 'AA13453') {
        found = true;
        const propertyAbout = row[propertyAboutIndex] || null;
        console.log(`✅ Found AA13453 in property spreadsheet (row ${i + 1})`);
        console.log(`  ●内覧前伝達事項 (BQ列): ${propertyAbout || 'null'}`);
        console.log('');
        
        // データベースの値と比較
        if (propertyAbout && propertyAbout !== dbData.property_about) {
          console.log('⚠️  MISMATCH DETECTED!');
          console.log(`  Database value: ${dbData.property_about || 'null'}`);
          console.log(`  Spreadsheet value: ${propertyAbout}`);
          console.log('');
          console.log('🔧 ACTION REQUIRED: Update database with correct value from property spreadsheet');
        } else if (propertyAbout === dbData.property_about) {
          console.log('✅ Database value matches property spreadsheet (CORRECT SOURCE)');
        } else if (!propertyAbout && dbData.property_about) {
          console.log('⚠️  Property spreadsheet has no value, but database has value');
          console.log('  This might be from individual property spreadsheet (fallback source)');
        }
        break;
      }
    }
    
    if (!found) {
      console.log('❌ AA13453 not found in property spreadsheet');
    }
  } catch (error: any) {
    console.error('❌ Error reading property spreadsheet:', error.message);
  }
  
  console.log('');
  
  // 3. 個別物件スプレッドシート（代替）から取得
  console.log('📊 Step 3: Check individual property spreadsheet (FALLBACK SOURCE)');
  console.log('─'.repeat(60));
  
  try {
    const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
    
    // 業務リストから個別物件スプレッドシートのIDを取得
    const gyomuResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: gyomuListSpreadsheetId,
      range: '業務依頼!A:D',
    });

    const gyomuRows = gyomuResponse.data.values || [];
    let individualSpreadsheetId: string | null = null;
    
    for (const row of gyomuRows) {
      if (row[0] === 'AA13453') {
        const spreadsheetUrl = row[3];
        if (spreadsheetUrl) {
          const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            individualSpreadsheetId = match[1];
            console.log(`✅ Found individual spreadsheet ID: ${individualSpreadsheetId}`);
            break;
          }
        }
      }
    }
    
    if (!individualSpreadsheetId) {
      console.log('❌ Individual spreadsheet ID not found');
      return;
    }
    
    // athomeシートから「内覧時伝達事項」を検索
    const athomeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!A:B',
    });

    const athomeRows = athomeResponse.data.values || [];
    
    for (let i = 0; i < athomeRows.length; i++) {
      const cellA = athomeRows[i][0] || '';
      if (cellA.includes('内覧時伝達事項')) {
        if (i + 1 < athomeRows.length) {
          const value = athomeRows[i + 1][1] || null;
          console.log(`✅ Found in individual spreadsheet (row ${i + 2}, column B)`);
          console.log(`  内覧時伝達事項: ${value || 'null'}`);
          console.log('');
          
          // データベースの値と比較
          if (value && value === dbData.property_about) {
            console.log('⚠️  Database value matches FALLBACK source (individual spreadsheet)');
            console.log('  This is INCORRECT! Should use property spreadsheet (priority source)');
          }
        }
        break;
      }
    }
  } catch (error: any) {
    console.error('❌ Error reading individual spreadsheet:', error.message);
  }
  
  console.log('');
  console.log('═'.repeat(60));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(60));
  console.log('Correct source: Property spreadsheet (1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY)');
  console.log('  Sheet: 物件');
  console.log('  Column: BQ列 (●内覧前伝達事項)');
  console.log('');
  console.log('Fallback source: Individual property spreadsheet');
  console.log('  Sheet: athome');
  console.log('  Search: A列で「内覧時伝達事項」を検索 → 次の行のB列');
}

checkPropertyAboutSource()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Check failed:', error.message);
    process.exit(1);
  });
