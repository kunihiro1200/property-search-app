/**
 * 査定額を同期するスクリプト
 * 査定方法はあるが査定額がない売主を対象
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

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const str = String(value).replace(/,/g, '').trim();
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function syncValuationAmounts() {
  console.log('🔄 査定額を同期します...\n');

  // 1. 査定方法はあるが査定額がない売主を取得
  console.log('📊 査定方法はあるが査定額がない売主を取得中...');
  
  const { data: sellersToSync, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number')
    .is('valuation_amount_1', null)
    .not('valuation_method', 'is', null);
  
  if (dbError) {
    console.error('❌ DBエラー:', dbError.message);
    return;
  }
  
  if (!sellersToSync || sellersToSync.length === 0) {
    console.log('✅ 同期対象の売主はいません');
    return;
  }
  
  console.log(`📋 同期対象: ${sellersToSync.length}件\n`);
  
  // 2. スプレッドシートからデータを取得
  console.log('📊 スプレッドシートからデータを取得中...');
  console.log('⏳ APIクォータ制限のため、60秒待機します...');
  
  // 60秒待機（クォータ回復のため）
  await new Promise(resolve => setTimeout(resolve, 60000));
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // CB, CC, CD列（手動入力査定額）を含めるため、範囲を拡張
  // CB=80, CC=81, CD=82 (1-indexed) → B列から始めるので、B:CZ（列2-104）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:CZ',
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  // ヘッダーのインデックスを取得
  const sellerNumberIndex = headers.indexOf('売主番号');
  
  // 査定額関連のカラムを検索
  let valuation1Index = -1;
  let valuation2Index = -1;
  let valuation3Index = -1;
  let valuation1AutoIndex = -1;
  let valuation2AutoIndex = -1;
  let valuation3AutoIndex = -1;
  
  headers.forEach((header: string, index: number) => {
    if (header === '査定額1') valuation1Index = index;
    if (header === '査定額2') valuation2Index = index;
    if (header === '査定額3') valuation3Index = index;
    if (header === '査定額1（自動計算）v') valuation1AutoIndex = index;
    if (header === '査定額2（自動計算）v') valuation2AutoIndex = index;
    if (header === '査定額3（自動計算）v') valuation3AutoIndex = index;
  });
  
  console.log(`\n📋 査定額カラムのインデックス:`);
  console.log(`  査定額1: ${valuation1Index >= 0 ? `列${valuation1Index}` : '(見つからない)'}`);
  console.log(`  査定額2: ${valuation2Index >= 0 ? `列${valuation2Index}` : '(見つからない)'}`);
  console.log(`  査定額3: ${valuation3Index >= 0 ? `列${valuation3Index}` : '(見つからない)'}`);
  console.log(`  査定額1（自動計算）v: ${valuation1AutoIndex >= 0 ? `列${valuation1AutoIndex}` : '(見つからない)'}`);
  console.log(`  査定額2（自動計算）v: ${valuation2AutoIndex >= 0 ? `列${valuation2AutoIndex}` : '(見つからない)'}`);
  console.log(`  査定額3（自動計算）v: ${valuation3AutoIndex >= 0 ? `列${valuation3AutoIndex}` : '(見つからない)'}`);
  
  // スプレッドシートデータをマップに変換
  const spreadsheetData = new Map<string, any>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber) {
      // 手入力優先、なければ自動計算
      const val1 = (valuation1Index >= 0 ? row[valuation1Index] : null) || 
                   (valuation1AutoIndex >= 0 ? row[valuation1AutoIndex] : null);
      const val2 = (valuation2Index >= 0 ? row[valuation2Index] : null) || 
                   (valuation2AutoIndex >= 0 ? row[valuation2AutoIndex] : null);
      const val3 = (valuation3Index >= 0 ? row[valuation3Index] : null) || 
                   (valuation3AutoIndex >= 0 ? row[valuation3AutoIndex] : null);
      
      spreadsheetData.set(sellerNumber, {
        valuation_amount_1: val1,
        valuation_amount_2: val2,
        valuation_amount_3: val3,
      });
    }
  }
  
  // 3. 同期を実行
  console.log('\n🔄 同期を開始...\n');
  
  let syncedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  
  for (const seller of sellersToSync) {
    const sheetData = spreadsheetData.get(seller.seller_number);
    
    if (!sheetData) {
      console.log(`⚠️ ${seller.seller_number}: スプレッドシートに見つかりません`);
      skippedCount++;
      continue;
    }
    
    const updateData: Record<string, any> = {};
    
    // 査定額を万円→円に変換
    const val1 = parseNumeric(sheetData.valuation_amount_1);
    const val2 = parseNumeric(sheetData.valuation_amount_2);
    const val3 = parseNumeric(sheetData.valuation_amount_3);
    
    if (val1 !== null) updateData.valuation_amount_1 = val1 * 10000;
    if (val2 !== null) updateData.valuation_amount_2 = val2 * 10000;
    if (val3 !== null) updateData.valuation_amount_3 = val3 * 10000;
    
    if (Object.keys(updateData).length === 0) {
      console.log(`⏭️ ${seller.seller_number}: スプレッドシートにも査定額がありません`);
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
    
    const val1Str = updateData.valuation_amount_1 ? `${(updateData.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
    const val2Str = updateData.valuation_amount_2 ? `${(updateData.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
    const val3Str = updateData.valuation_amount_3 ? `${(updateData.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
    
    console.log(`✅ ${seller.seller_number}: ${val1Str} / ${val2Str} / ${val3Str}`);
    syncedCount++;
  }
  
  console.log('\n📊 同期結果:');
  console.log('-------------------');
  console.log(`✅ 同期成功: ${syncedCount}件`);
  console.log(`⏭️ スキップ: ${skippedCount}件`);
  console.log(`❌ エラー: ${errorCount}件`);
  console.log(`📋 合計: ${sellersToSync.length}件`);
}

syncValuationAmounts().catch(console.error);
