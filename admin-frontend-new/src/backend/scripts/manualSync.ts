// 手動で物件リスト同期を実行するスクリプト
import dotenv from 'dotenv';
import { google } from 'googleapis';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function manualSync() {
  console.log('🚀 Starting manual property sync from Google Sheets...\n');
  
  try {
    // Google Sheets認証
    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, '../../google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets authenticated\n');
    
    // Supabase接続
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    console.log('✅ Supabase connected\n');
    
    // スプレッドシートからデータを取得
    console.log('📊 Fetching data from spreadsheet...');
    const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID!;
    const sheetName = process.env.PROPERTY_LISTING_SHEET_NAME!;
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A:Z`,
    });
    
    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('❌ No data found in spreadsheet');
      process.exit(1);
    }
    
    console.log(`✅ Found ${rows.length - 1} rows (excluding header)\n`);
    
    // ヘッダー行を取得
    const headers = rows[0];
    const propertyNumberIndex = headers.indexOf('物件番号');
    
    if (propertyNumberIndex === -1) {
      console.log('❌ "物件番号" column not found');
      process.exit(1);
    }
    
    console.log('📊 Syncing properties to database...');
    let added = 0;
    let skipped = 0;
    let failed = 0;
    
    // データ行を処理（ヘッダーをスキップ）
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const propertyNumber = row[propertyNumberIndex];
      
      if (!propertyNumber) {
        skipped++;
        continue;
      }
      
      // 既存チェック
      const { data: existing } = await supabase
        .from('property_listings')
        .select('property_number')
        .eq('property_number', propertyNumber)
        .single();
      
      if (existing) {
        skipped++;
        if (i % 100 === 0) {
          console.log(`   Progress: ${i}/${rows.length - 1} (${added} added, ${skipped} skipped)`);
        }
        continue;
      }
      
      // 新規追加（最小限のデータ）
      const { error } = await supabase
        .from('property_listings')
        .insert({
          property_number: propertyNumber,
          property_type: row[headers.indexOf('物件種別')] || null,
          atbb_status: row[headers.indexOf('ATBB状態')] || null,
        });
      
      if (error) {
        console.error(`   ❌ Failed to add ${propertyNumber}:`, error.message);
        failed++;
      } else {
        added++;
      }
      
      if (i % 100 === 0) {
        console.log(`   Progress: ${i}/${rows.length - 1} (${added} added, ${skipped} skipped)`);
      }
    }
    
    console.log('\n🎉 Sync complete!');
    console.log(`📊 Total rows: ${rows.length - 1}`);
    console.log(`✅ Added: ${added}`);
    console.log(`⏭️ Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    
  } catch (error: any) {
    console.error('\n❌ Sync failed:', error.message);
    console.error('📋 Error stack:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

manualSync();
