/**
 * 軽量同期スクリプト
 * スプレッドシートの最後の20行のみを取得して新規追加を検出
 * Windowsタスクスケジューラから5分ごとに実行
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function lightSync() {
  const startTime = Date.now();
  console.log(`[${new Date().toISOString()}] 🔄 軽量同期を開始...`);

  try {
    // Google Sheets認証
    const credentialsPath = path.join(__dirname, '..', 'google-service-account.json');
    const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

    // スプレッドシートの行数を取得
    const metaResponse = await sheets.spreadsheets.get({
      spreadsheetId,
      ranges: ['売主リスト!B:B'],
      fields: 'sheets.properties.gridProperties.rowCount',
    });
    
    const totalRows = metaResponse.data.sheets?.[0]?.properties?.gridProperties?.rowCount || 5000;
    const startRow = Math.max(2, totalRows - 20); // 最後の20行（ヘッダー除く）
    
    console.log(`📊 総行数: ${totalRows}, 取得開始行: ${startRow}`);

    // 最後の20行を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `売主リスト!B${startRow}:CZ${totalRows}`,
    });

    const rows = response.data.values || [];
    console.log(`📥 取得した行数: ${rows.length}`);

    if (rows.length === 0) {
      console.log('✅ 新規データなし');
      return;
    }

    // ヘッダーを取得（1行目から）
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '売主リスト!B1:CZ1',
    });
    const headers = headerResponse.data.values?.[0] || [];

    // 売主番号のインデックスを取得
    const sellerNumberIdx = 0; // B列 = 売主番号

    // 新規売主を検出
    const sellerNumbers = rows
      .map(row => row[sellerNumberIdx])
      .filter(num => num && num.toString().trim() !== '');

    if (sellerNumbers.length === 0) {
      console.log('✅ 有効な売主番号なし');
      return;
    }

    // DBに存在するか確認
    const { data: existingSellers, error: queryError } = await supabase
      .from('sellers')
      .select('seller_number')
      .in('seller_number', sellerNumbers);

    if (queryError) {
      console.error('❌ DB検索エラー:', queryError.message);
      return;
    }

    const existingNumbers = new Set(existingSellers?.map(s => s.seller_number) || []);
    const newSellers = sellerNumbers.filter(num => !existingNumbers.has(num));

    if (newSellers.length === 0) {
      console.log('✅ 新規売主なし');
      return;
    }

    console.log(`🆕 新規売主を検出: ${newSellers.length}件`);
    console.log(`   ${newSellers.join(', ')}`);

    // 新規売主をDBに追加
    for (const sellerNumber of newSellers) {
      const row = rows.find(r => r[sellerNumberIdx] === sellerNumber);
      if (!row) continue;

      // 基本データを抽出
      const getColumnValue = (columnName: string) => {
        const idx = headers.indexOf(columnName);
        return idx !== -1 ? row[idx] : null;
      };

      const sellerData = {
        seller_number: sellerNumber,
        name: getColumnValue('名前(漢字のみ）') || '',
        property_address: getColumnValue('物件所在地') || null,
        property_type: getColumnValue('種別') || null,
        status: getColumnValue('状況（当社）') || null,
        inquiry_site: getColumnValue('サイト') || null,
        inquiry_date: parseDate(getColumnValue('反響日付')),
      };

      const { error: insertError } = await supabase
        .from('sellers')
        .insert(sellerData);

      if (insertError) {
        console.error(`❌ ${sellerNumber} 追加エラー:`, insertError.message);
      } else {
        console.log(`✅ ${sellerNumber} を追加しました`);
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`🎉 軽量同期完了 (${duration}秒)`);

  } catch (error: any) {
    console.error('❌ 軽量同期エラー:', error.message);
  }
}

function parseDate(value: any): string | null {
  if (!value) return null;
  
  // 日付形式を解析
  const str = String(value).trim();
  
  // YYYY/MM/DD または YYYY-MM-DD
  const match = str.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}

// 実行
lightSync();
