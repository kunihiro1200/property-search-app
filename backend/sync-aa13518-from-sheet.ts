/**
 * AA13518をスプレッドシートからデータベースに同期するスクリプト
 */

import { google } from 'googleapis';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA13518() {
  console.log('=== AA13518 同期スクリプト ===\n');

  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  console.log('1. ヘッダー行を取得中...');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];
  console.log(`   ヘッダー数: ${headers.length}`);

  // AA13518の行を検索
  console.log('\n2. AA13518を検索中...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];
  
  // AA13518を探す（B列が売主番号、インデックス0）
  const aa13518RowIndex = rows.findIndex(row => row[0] === 'AA13518');
  
  if (aa13518RowIndex === -1) {
    console.log('❌ AA13518がスプレッドシートに見つかりません');
    return;
  }

  const aa13518Row = rows[aa13518RowIndex];
  console.log(`✅ AA13518を発見（行 ${aa13518RowIndex + 1}）`);

  // ヘッダーとデータをマッピング
  const rowData: Record<string, any> = {};
  headers.forEach((header, index) => {
    if (header && aa13518Row[index] !== undefined) {
      rowData[header] = aa13518Row[index];
    }
  });

  console.log('\n3. AA13518のデータ:');
  console.log('   売主番号:', rowData['売主番号'] || aa13518Row[0]);
  console.log('   名前:', rowData['名前(漢字のみ）'] || '(なし)');
  console.log('   物件所在地:', rowData['物件所在地'] || '(なし)');
  console.log('   種別:', rowData['種別'] || '(なし)');
  console.log('   状況（当社）:', rowData['状況（当社）'] || '(なし)');
  console.log('   反響日付:', rowData['反響日付'] || '(なし)');
  console.log('   サイト:', rowData['サイト'] || '(なし)');

  // データベースに挿入するデータを準備
  console.log('\n4. データベースに挿入中...');
  
  const insertData: Record<string, any> = {
    seller_number: aa13518Row[0], // B列
  };

  // カラムマッピング（主要なフィールドのみ）
  const columnMapping: Record<string, string> = {
    '名前(漢字のみ）': 'name',
    '依頼者住所(物件所在と異なる場合）': 'address',
    '電話番号\nハイフン不要': 'phone_number',
    'メールアドレス': 'email',
    'サイト': 'inquiry_site',
    '種別': 'property_type',
    '物件所在地': 'property_address',
    '状況（当社）': 'status',
    '反響日付': 'inquiry_date',
    '反響年': 'inquiry_year',
    '次電日': 'next_call_date',
    '営担': 'visit_assignee',
    '訪問日 \nY/M/D': 'visit_date',
    '確度': 'confidence_level',
    'コメント': 'comments',
    '不通': 'unreachable_status',
    '電話担当（任意）': 'phone_contact_person',
    '連絡取りやすい日、時間帯': 'preferred_contact_time',
    '連絡方法': 'contact_method',
    '査定方法': 'valuation_method',
    '査定額': 'valuation_text',
  };

  // マッピングに従ってデータを設定
  for (const [sheetCol, dbCol] of Object.entries(columnMapping)) {
    if (rowData[sheetCol]) {
      insertData[dbCol] = rowData[sheetCol];
    }
  }

  // 日付フィールドの処理
  if (insertData.inquiry_date) {
    insertData.inquiry_date = parseDate(insertData.inquiry_date);
  }
  if (insertData.next_call_date) {
    insertData.next_call_date = parseDate(insertData.next_call_date);
  }
  if (insertData.visit_date) {
    insertData.visit_date = parseDate(insertData.visit_date);
  }

  console.log('   挿入データ:', JSON.stringify(insertData, null, 2));

  // データベースに挿入
  const { data, error } = await supabase
    .from('sellers')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.log('\n❌ 挿入エラー:', error.message);
    console.log('   詳細:', error);
  } else {
    console.log('\n✅ AA13518をデータベースに同期しました');
    console.log('   ID:', data.id);
    console.log('   売主番号:', data.seller_number);
  }
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  // 日本語の日付形式を処理
  // 例: "2026/1/31", "2026-01-31", "1/31"
  const parts = dateStr.split(/[\/\-]/);
  
  if (parts.length === 3) {
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  } else if (parts.length === 2) {
    // 年がない場合は現在の年を使用
    const currentYear = new Date().getFullYear();
    const month = parseInt(parts[0]);
    const day = parseInt(parts[1]);
    return `${currentYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  
  return null;
}

syncAA13518().catch(console.error);
