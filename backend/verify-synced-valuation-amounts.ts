/**
 * 同期済み売主の査定額を検証するスクリプト
 * CB, CC, CD列（手動入力）の値と比較
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

async function verifySyncedValuationAmounts() {
  // 検証対象の売主
  const targetSellers = ['AA13500', 'AA13505', 'AA13509', 'AA13510', 'AA13495', 'AA13498'];
  
  console.log('🔍 同期済み売主の査定額を検証します...\n');
  console.log(`📋 対象: ${targetSellers.join(', ')}\n`);
  
  // 1. DBから現在の値を取得
  console.log('📊 データベースから現在の値を取得中...');
  const { data: dbSellers, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3')
    .in('seller_number', targetSellers);
  
  if (dbError) {
    console.error('❌ DBエラー:', dbError.message);
    return;
  }
  
  const dbMap = new Map<string, any>();
  dbSellers?.forEach(s => dbMap.set(s.seller_number, s));
  
  // 2. スプレッドシートから値を取得
  console.log('📊 スプレッドシートから値を取得中...');
  
  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // CB, CC, CD列を含む範囲を取得（B:CZ = 列1-103）
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:CZ',
  });
  
  const rows = response.data.values || [];
  const headers = rows[0];
  
  // ヘッダーのインデックスを取得
  const sellerNumberIndex = headers.indexOf('売主番号');
  
  // 査定額カラムのインデックス
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
  
  console.log(`\n📋 カラム位置:`);
  console.log(`  査定額1（手動入力）: 列${valuation1Index} (${valuation1Index >= 0 ? 'CB列相当' : '見つからない'})`);
  console.log(`  査定額2（手動入力）: 列${valuation2Index}`);
  console.log(`  査定額3（手動入力）: 列${valuation3Index}`);
  console.log(`  査定額1（自動計算）: 列${valuation1AutoIndex}`);
  console.log(`  査定額2（自動計算）: 列${valuation2AutoIndex}`);
  console.log(`  査定額3（自動計算）: 列${valuation3AutoIndex}`);
  
  // スプレッドシートデータをマップに変換
  const sheetMap = new Map<string, any>();
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber && targetSellers.includes(sellerNumber)) {
      const manual1 = valuation1Index >= 0 ? row[valuation1Index] : null;
      const manual2 = valuation2Index >= 0 ? row[valuation2Index] : null;
      const manual3 = valuation3Index >= 0 ? row[valuation3Index] : null;
      const auto1 = valuation1AutoIndex >= 0 ? row[valuation1AutoIndex] : null;
      const auto2 = valuation2AutoIndex >= 0 ? row[valuation2AutoIndex] : null;
      const auto3 = valuation3AutoIndex >= 0 ? row[valuation3AutoIndex] : null;
      
      sheetMap.set(sellerNumber, {
        manual: { val1: manual1, val2: manual2, val3: manual3 },
        auto: { val1: auto1, val2: auto2, val3: auto3 },
        expected: {
          val1: manual1 || auto1,
          val2: manual2 || auto2,
          val3: manual3 || auto3,
        }
      });
    }
  }
  
  // 3. 比較
  console.log('\n📊 検証結果:\n');
  console.log('=' .repeat(100));
  
  let correctCount = 0;
  let incorrectCount = 0;
  
  for (const sellerNumber of targetSellers) {
    const dbData = dbMap.get(sellerNumber);
    const sheetData = sheetMap.get(sellerNumber);
    
    console.log(`\n📋 ${sellerNumber}:`);
    
    if (!sheetData) {
      console.log('  ⚠️ スプレッドシートに見つかりません');
      continue;
    }
    
    if (!dbData) {
      console.log('  ⚠️ データベースに見つかりません');
      continue;
    }
    
    // スプレッドシートの値
    console.log(`  📄 スプレッドシート:`);
    console.log(`     手動入力(CB,CC,CD): ${sheetData.manual.val1 || '(空)'} / ${sheetData.manual.val2 || '(空)'} / ${sheetData.manual.val3 || '(空)'}`);
    console.log(`     自動計算: ${sheetData.auto.val1 || '(空)'} / ${sheetData.auto.val2 || '(空)'} / ${sheetData.auto.val3 || '(空)'}`);
    console.log(`     期待値（手動優先）: ${sheetData.expected.val1 || '(空)'} / ${sheetData.expected.val2 || '(空)'} / ${sheetData.expected.val3 || '(空)'}万円`);
    
    // DBの値（円→万円に変換）
    const dbVal1 = dbData.valuation_amount_1 ? dbData.valuation_amount_1 / 10000 : null;
    const dbVal2 = dbData.valuation_amount_2 ? dbData.valuation_amount_2 / 10000 : null;
    const dbVal3 = dbData.valuation_amount_3 ? dbData.valuation_amount_3 / 10000 : null;
    
    console.log(`  💾 データベース: ${dbVal1 || '(空)'} / ${dbVal2 || '(空)'} / ${dbVal3 || '(空)'}万円`);
    
    // 比較
    const expected1 = parseFloat(sheetData.expected.val1) || null;
    const expected2 = parseFloat(sheetData.expected.val2) || null;
    const expected3 = parseFloat(sheetData.expected.val3) || null;
    
    const isCorrect = 
      dbVal1 === expected1 &&
      dbVal2 === expected2 &&
      dbVal3 === expected3;
    
    if (isCorrect) {
      console.log(`  ✅ 正しい値が同期されています`);
      correctCount++;
    } else {
      console.log(`  ❌ 値が一致しません！`);
      if (dbVal1 !== expected1) console.log(`     査定額1: DB=${dbVal1}, 期待=${expected1}`);
      if (dbVal2 !== expected2) console.log(`     査定額2: DB=${dbVal2}, 期待=${expected2}`);
      if (dbVal3 !== expected3) console.log(`     査定額3: DB=${dbVal3}, 期待=${expected3}`);
      incorrectCount++;
    }
  }
  
  console.log('\n' + '=' .repeat(100));
  console.log(`\n📊 検証結果サマリー:`);
  console.log(`  ✅ 正しい: ${correctCount}件`);
  console.log(`  ❌ 不一致: ${incorrectCount}件`);
}

verifySyncedValuationAmounts().catch(console.error);
