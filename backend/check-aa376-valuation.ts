/**
 * AA376の査定額データを確認するスクリプト
 */

import { google } from 'googleapis';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';

async function checkAA376Valuation() {
  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // まずヘッダー行を取得してI列が何か確認
  console.log('=== スプレッドシートのヘッダー確認 ===');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!A1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  
  // I列（インデックス8）の内容を確認
  console.log('I列（インデックス8）:', headers[8]);
  console.log('');
  
  // 査定額関連のカラムを探す
  console.log('=== 査定額関連のカラム ===');
  headers.forEach((header, index) => {
    if (header && (header.includes('査定') || header.includes('金額') || header.includes('価格'))) {
      const colLetter = getColumnLetter(index);
      console.log(`${colLetter}列（インデックス${index}）: ${header}`);
    }
  });
  console.log('');

  // AA376の行を検索
  console.log('=== AA376のデータ検索 ===');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];
  
  // AA376を探す（B列が売主番号）
  const aa376Row = rows.find(row => row[0] === 'AA376');
  if (!aa376Row) {
    console.log('AA376が見つかりません');
    return;
  }

  console.log('AA376のデータ:');
  console.log('  売主番号（B列）:', aa376Row[0]);
  console.log('  I列の値:', aa376Row[7]); // B列が0なので、I列は7
  console.log('');

  // 査定額関連のフィールドを表示
  console.log('=== AA376の査定額関連フィールド ===');
  
  // 各査定額カラムの値を表示
  const valuationColumns = [
    { name: '査定額1（自動計算）v', index: 53 }, // 列54 (0-indexed: 53, B列起点なので-1: 52)
    { name: '査定額2（自動計算）v', index: 54 },
    { name: '査定額3（自動計算）v', index: 55 },
    { name: '査定額1（手動）CB列', index: 78 }, // CB列 = 79 (0-indexed: 78, B列起点なので-1: 77)
    { name: '査定額2（手動）CC列', index: 79 },
    { name: '査定額3（手動）CD列', index: 80 },
  ];

  // B列起点なので調整
  valuationColumns.forEach(col => {
    const adjustedIndex = col.index - 1; // B列が0なので
    const value = aa376Row[adjustedIndex];
    console.log(`  ${col.name}: ${value || '(空)'}`);
  });

  // I列の正確な位置を確認（A列起点）
  console.log('');
  console.log('=== I列の詳細確認 ===');
  // I列はA列から数えて9番目（0-indexed: 8）
  // B列起点のデータでは、I列は7番目（0-indexed: 7）
  console.log('I列（B列起点でインデックス7）:', aa376Row[7]);
  
  // ヘッダーでI列を確認
  console.log('I列のヘッダー:', headers[8]); // A列起点

  // データベースの値も確認
  console.log('');
  console.log('=== データベースのAA376 ===');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, valuation_amount_1, valuation_amount_2, valuation_amount_3, property_address, property_type, land_area, building_area')
    .eq('seller_number', 'AA376')
    .single();

  if (error) {
    console.log('エラー:', error.message);
  } else if (seller) {
    console.log('  売主番号:', seller.seller_number);
    console.log('  査定額1:', seller.valuation_amount_1);
    console.log('  査定額2:', seller.valuation_amount_2);
    console.log('  査定額3:', seller.valuation_amount_3);
    console.log('  物件住所:', seller.property_address);
    console.log('  種別:', seller.property_type);
    console.log('  土地面積:', seller.land_area);
    console.log('  建物面積:', seller.building_area);
  }
}

function getColumnLetter(index: number): string {
  let letter = '';
  while (index >= 0) {
    letter = String.fromCharCode((index % 26) + 65) + letter;
    index = Math.floor(index / 26) - 1;
  }
  return letter;
}

checkAA376Valuation().catch(console.error);
