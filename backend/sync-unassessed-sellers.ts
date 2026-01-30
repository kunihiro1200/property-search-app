/**
 * 未査定ステータスの売主を一括同期するスクリプト
 * 
 * 問題: valuation_method（査定方法）がスプレッドシートから同期されていなかった
 * 原因: EnhancedAutoSyncService.tsのupdateSingleSellerとsyncSingleSellerに
 *       valuation_methodの同期処理が含まれていなかった
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function getGoogleSheetsClient() {
  const keyPath = path.join(__dirname, 'google-service-account.json');
  const credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
  
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  return google.sheets({ version: 'v4', auth });
}

async function syncUnassessedSellers() {
  console.log('🔄 未査定ステータスの売主を一括同期します...\n');

  // 1. DBから未査定の売主を取得（valuation_methodが空で、inquiry_dateが2026/1/1以降）
  console.log('📊 データベースから未査定の売主を取得中...');
  
  const { data: unassessedSellers, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, valuation_method, contact_method, inquiry_date, status')
    .is('valuation_method', null)
    .gte('inquiry_date', '2026-01-01')
    .like('status', '%追客中%');
  
  if (dbError) {
    console.error('❌ DBエラー:', dbError.message);
    return;
  }
  
  console.log(`📋 未査定の売主: ${unassessedSellers?.length || 0}件\n`);
  
  if (!unassessedSellers || unassessedSellers.length === 0) {
    console.log('✅ 未査定の売主はいません');
    return;
  }
  
  // 2. スプレッドシートからデータを取得
  console.log('📊 スプレッドシートからデータを取得中...');
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:BZ',
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  // ヘッダーのインデックスを取得
  const sellerNumberIndex = headers.indexOf('売主番号');
  const valuationMethodIndex = headers.indexOf('査定方法');
  const contactMethodIndex = headers.indexOf('連絡方法');
  const preferredContactTimeIndex = headers.indexOf('連絡取りやすい日、時間帯');
  const phoneContactPersonIndex = headers.indexOf('電話担当（任意）');
  
  console.log(`📋 ヘッダー確認:`);
  console.log(`  売主番号: ${sellerNumberIndex >= 0 ? '✅' : '❌'} (列${sellerNumberIndex})`);
  console.log(`  査定方法: ${valuationMethodIndex >= 0 ? '✅' : '❌'} (列${valuationMethodIndex})`);
  console.log(`  連絡方法: ${contactMethodIndex >= 0 ? '✅' : '❌'} (列${contactMethodIndex})`);
  console.log(`  連絡取りやすい日、時間帯: ${preferredContactTimeIndex >= 0 ? '✅' : '❌'} (列${preferredContactTimeIndex})`);
  console.log(`  電話担当（任意）: ${phoneContactPersonIndex >= 0 ? '✅' : '❌'} (列${phoneContactPersonIndex})\n`);
  
  // スプレッドシートデータをマップに変換
  const spreadsheetData = new Map<string, any>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber) {
      spreadsheetData.set(sellerNumber, {
        valuation_method: valuationMethodIndex >= 0 ? row[valuationMethodIndex] : null,
        contact_method: contactMethodIndex >= 0 ? row[contactMethodIndex] : null,
        preferred_contact_time: preferredContactTimeIndex >= 0 ? row[preferredContactTimeIndex] : null,
        phone_contact_person: phoneContactPersonIndex >= 0 ? row[phoneContactPersonIndex] : null,
      });
    }
  }
  
  // 3. 未査定の売主を同期
  console.log('🔄 同期を開始...\n');
  
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const seller of unassessedSellers) {
    const sheetData = spreadsheetData.get(seller.seller_number);
    
    if (!sheetData) {
      console.log(`⚠️ ${seller.seller_number}: スプレッドシートに見つかりません`);
      skippedCount++;
      continue;
    }
    
    const updateData: Record<string, any> = {};
    
    // 査定方法
    if (sheetData.valuation_method && sheetData.valuation_method.trim() !== '') {
      updateData.valuation_method = sheetData.valuation_method;
    }
    
    // 連絡方法
    if (sheetData.contact_method && sheetData.contact_method.trim() !== '') {
      updateData.contact_method = sheetData.contact_method;
    }
    
    // 連絡取りやすい日、時間帯
    if (sheetData.preferred_contact_time && sheetData.preferred_contact_time.trim() !== '') {
      updateData.preferred_contact_time = sheetData.preferred_contact_time;
    }
    
    // 電話担当（任意）
    if (sheetData.phone_contact_person && sheetData.phone_contact_person.trim() !== '') {
      updateData.phone_contact_person = sheetData.phone_contact_person;
    }
    
    if (Object.keys(updateData).length === 0) {
      console.log(`⏭️ ${seller.seller_number}: 更新データなし（スプレッドシートも空）`);
      skippedCount++;
      continue;
    }
    
    const { error: updateError } = await supabase
      .from('sellers')
      .update(updateData)
      .eq('seller_number', seller.seller_number);
    
    if (updateError) {
      console.error(`❌ ${seller.seller_number}: 更新エラー - ${updateError.message}`);
      errorCount++;
      continue;
    }
    
    console.log(`✅ ${seller.seller_number}: 同期完了`);
    console.log(`   査定方法: ${updateData.valuation_method || '(変更なし)'}`);
    console.log(`   連絡方法: ${updateData.contact_method || '(変更なし)'}`);
    syncedCount++;
  }
  
  console.log('\n📊 同期結果:');
  console.log('-------------------');
  console.log(`✅ 同期成功: ${syncedCount}件`);
  console.log(`⏭️ スキップ: ${skippedCount}件`);
  console.log(`❌ エラー: ${errorCount}件`);
  console.log(`📋 合計: ${unassessedSellers.length}件`);
}

syncUnassessedSellers().catch(console.error);
