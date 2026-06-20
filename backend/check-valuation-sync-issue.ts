/**
 * 査定額の同期問題を診断するスクリプト
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

async function checkValuationSyncIssue() {
  console.log('🔍 査定額の同期問題を診断します...\n');

  const sheets = await getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  
  // スプレッドシートのヘッダーを取得
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!1:1',
  });
  
  const headers = response.data.values?.[0] || [];
  
  console.log('📋 査定額関連のカラムを検索...\n');
  
  // 査定額関連のカラムを検索
  const valuationColumns: { index: number; name: string }[] = [];
  headers.forEach((header: string, index: number) => {
    if (header && header.includes('査定')) {
      valuationColumns.push({ index, name: header });
    }
  });
  
  console.log('📊 査定額関連のカラム:');
  valuationColumns.forEach(col => {
    console.log(`  列${col.index + 1}: "${col.name}"`);
  });
  
  // AA13508のデータを確認（査定額の問題があった売主）
  console.log('\n📋 AA13508のスプレッドシートデータを確認...');
  
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:BZ',
  });
  
  const rows = dataResponse.data.values || [];
  const dataHeaders = rows[0];
  
  // AA13508の行を検索
  let aa13508Row: string[] | null = null;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'AA13508') {
      aa13508Row = rows[i];
      break;
    }
  }
  
  if (aa13508Row) {
    console.log('\n📊 AA13508のスプレッドシートデータ:');
    valuationColumns.forEach(col => {
      // B列から始まるので、インデックスを調整
      const adjustedIndex = col.index - 1; // B列が0になる
      const value = adjustedIndex >= 0 && adjustedIndex < aa13508Row!.length 
        ? aa13508Row![adjustedIndex] 
        : '(範囲外)';
      console.log(`  ${col.name}: ${value || '(空)'}`);
    });
    
    // 査定方法も確認
    const valuationMethodIndex = dataHeaders.indexOf('査定方法');
    if (valuationMethodIndex >= 0) {
      console.log(`  査定方法: ${aa13508Row[valuationMethodIndex] || '(空)'}`);
    }
  } else {
    console.log('❌ AA13508がスプレッドシートに見つかりません');
  }
  
  // DBのAA13508データを確認
  console.log('\n📋 AA13508のデータベースデータを確認...');
  
  const { data: dbSeller, error } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .eq('seller_number', 'AA13508')
    .single();
  
  if (error) {
    console.error('❌ DBエラー:', error.message);
  } else if (dbSeller) {
    console.log('\n📊 AA13508のデータベースデータ:');
    console.log(`  査定額1: ${dbSeller.valuation_amount_1 || '(空)'}`);
    console.log(`  査定額2: ${dbSeller.valuation_amount_2 || '(空)'}`);
    console.log(`  査定額3: ${dbSeller.valuation_amount_3 || '(空)'}`);
    console.log(`  査定方法: ${dbSeller.valuation_method || '(空)'}`);
  }
  
  // 複数の売主で査定額の状態を確認
  console.log('\n📋 査定額が空の売主を確認...');
  
  const { data: sellersWithoutValuation } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_method')
    .is('valuation_amount_1', null)
    .not('valuation_method', 'is', null)
    .limit(10);
  
  if (sellersWithoutValuation && sellersWithoutValuation.length > 0) {
    console.log(`\n⚠️ 査定方法はあるが査定額がない売主: ${sellersWithoutValuation.length}件`);
    sellersWithoutValuation.forEach(s => {
      console.log(`  ${s.seller_number}: 査定方法=${s.valuation_method}, 査定額1=${s.valuation_amount_1 || '(空)'}`);
    });
  } else {
    console.log('✅ 査定方法があって査定額がない売主はいません');
  }
}

checkValuationSyncIssue().catch(console.error);
