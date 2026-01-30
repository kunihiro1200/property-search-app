/**
 * AA13509の査定額をスプレッドシートから確認するスクリプト
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

async function checkAA13509Valuation() {
  console.log('🔍 AA13509の査定額を確認します...\n');

  // 1. DBの現在の値を確認
  console.log('📊 DBの現在の値:');
  const { data: dbData, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, valuation_method')
    .eq('seller_number', 'AA13509')
    .single();
  
  if (dbError) {
    console.error('❌ DBエラー:', dbError.message);
  } else if (dbData) {
    const val1 = dbData.valuation_amount_1 ? `${(dbData.valuation_amount_1 / 10000).toLocaleString()}万円` : '(空)';
    const val2 = dbData.valuation_amount_2 ? `${(dbData.valuation_amount_2 / 10000).toLocaleString()}万円` : '(空)';
    const val3 = dbData.valuation_amount_3 ? `${(dbData.valuation_amount_3 / 10000).toLocaleString()}万円` : '(空)';
    console.log(`  AA13509: ${val1} / ${val2} / ${val3}`);
    console.log(`  査定方法: ${dbData.valuation_method || '(空)'}`);
  }

  // 2. スプレッドシートからデータを取得
  console.log('\n📊 スプレッドシートからデータを取得中...');
  
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
  
  // 全ての査定額関連カラムを検索
  console.log('\n📋 査定額関連のカラム:');
  headers.forEach((header: string, index: number) => {
    if (header.includes('査定額')) {
      console.log(`  列${index}: "${header}"`);
    }
  });
  
  // AA13509の行を検索
  console.log('\n📋 AA13509のスプレッドシートデータ:');
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[sellerNumberIndex];
    if (sellerNumber === 'AA13509') {
      console.log(`  行番号: ${i + 1}`);
      
      // 全ての査定額関連カラムの値を表示
      headers.forEach((header: string, index: number) => {
        if (header.includes('査定額')) {
          const value = row[index] || '(空)';
          console.log(`  ${header}: ${value}`);
        }
      });
      break;
    }
  }
  
  console.log('\n📊 期待値: 3680万円 / 3980万円 / 4280万円');
}

checkAA13509Valuation().catch(console.error);
