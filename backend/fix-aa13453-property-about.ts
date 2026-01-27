/**
 * AA13453の「こちらの物件について」を正しい値に修正
 * 
 * 正しい取得元: 物件スプレッドシート（1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY）
 * シート: 物件
 * 列: BQ列（●内覧前伝達事項）
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixPropertyAbout() {
  console.log('🔧 Fixing property_about for AA13453...\n');

  // 1. 物件スプレッドシートから正しい値を取得
  console.log('📊 Step 1: Get correct value from property spreadsheet');
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
  
  let correctValue: string | null = null;
  
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: propertySpreadsheetId,
      range: '物件!A:BQ',
    });

    const rows = response.data.values || [];
    const headers = rows[0] || [];
    
    const propertyNumberIndex = headers.findIndex((h: string) => h === '物件番号');
    const propertyAboutIndex = headers.findIndex((h: string) => h === '●内覧前伝達事項');
    
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[propertyNumberIndex] === 'AA13453') {
        correctValue = row[propertyAboutIndex] || null;
        console.log(`✅ Found AA13453 in property spreadsheet (row ${i + 1})`);
        console.log(`  Correct value: ${correctValue || 'null'}`);
        break;
      }
    }
    
    if (!correctValue) {
      console.log('❌ No value found in property spreadsheet');
      return;
    }
  } catch (error: any) {
    console.error('❌ Error reading property spreadsheet:', error.message);
    return;
  }
  
  console.log('');
  
  // 2. データベースの現在の値を確認
  console.log('📊 Step 2: Check current database value');
  console.log('─'.repeat(60));
  
  const { data: currentData, error: selectError } = await supabase
    .from('property_details')
    .select('property_number, property_about')
    .eq('property_number', 'AA13453')
    .single();

  if (selectError) {
    console.error('❌ Database error:', selectError.message);
    return;
  }

  console.log(`Current database value: ${currentData.property_about || 'null'}`);
  console.log('');
  
  // 3. データベースを更新
  console.log('📊 Step 3: Update database with correct value');
  console.log('─'.repeat(60));
  
  const { error: updateError } = await supabase
    .from('property_details')
    .update({
      property_about: correctValue,
      updated_at: new Date().toISOString()
    })
    .eq('property_number', 'AA13453');

  if (updateError) {
    console.error('❌ Update failed:', updateError.message);
    return;
  }

  console.log('✅ Database updated successfully');
  console.log('');
  
  // 4. 更新後の値を確認
  console.log('📊 Step 4: Verify updated value');
  console.log('─'.repeat(60));
  
  const { data: updatedData, error: verifyError } = await supabase
    .from('property_details')
    .select('property_number, property_about')
    .eq('property_number', 'AA13453')
    .single();

  if (verifyError) {
    console.error('❌ Verification error:', verifyError.message);
    return;
  }

  console.log(`Updated database value: ${updatedData.property_about || 'null'}`);
  console.log('');
  
  // 5. 値が一致するか確認
  if (updatedData.property_about === correctValue) {
    console.log('✅ SUCCESS: Database value now matches property spreadsheet');
  } else {
    console.log('⚠️  WARNING: Values do not match');
    console.log(`  Expected: ${correctValue}`);
    console.log(`  Actual: ${updatedData.property_about}`);
  }
  
  console.log('');
  console.log('═'.repeat(60));
  console.log('📋 SUMMARY');
  console.log('═'.repeat(60));
  console.log('✅ AA13453の「こちらの物件について」を修正しました');
  console.log('');
  console.log('取得元: 物件スプレッドシート（正しい優先ソース）');
  console.log('  スプレッドシートID: 1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY');
  console.log('  シート: 物件');
  console.log('  列: BQ列（●内覧前伝達事項）');
}

fixPropertyAbout()
  .then(() => {
    console.log('\n✅ Fix completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  });
