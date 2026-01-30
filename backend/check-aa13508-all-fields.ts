import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// ステアリングドキュメントに基づく全フィールドのマッピング
const ALL_FIELDS = {
  'seller_number': '売主番号',
  'name': '名前(漢字のみ）',
  'address': '依頼者住所(物件所在と異なる場合）',
  'phone_number': '電話番号\nハイフン不要',
  'email': 'メールアドレス',
  'inquiry_site': 'サイト',
  'property_type': '種別',
  'property_address': '物件所在地',
  'land_area': '土（㎡）',
  'building_area': '建（㎡）',
  'build_year': '築年',
  'structure': '構造',
  'floor_plan': '間取り',
  'current_status': '状況（売主）',
  'inquiry_year': '反響年',
  'inquiry_date': '反響日付',
  'inquiry_detailed_datetime': '反響詳細日時',
  'valuation_amount_1': '査定額1（自動計算）v',
  'valuation_amount_2': '査定額2（自動計算）v',
  'valuation_amount_3': '査定額3（自動計算）v',
  'visit_acquisition_date': '訪問取得日\n年/月/日',
  'visit_date': '訪問日 \nY/M/D',
  'visit_time': '訪問時間',
  'visit_assignee': '営担',
  'visit_valuation_acquirer': '訪問査定取得者',
  'valuation_assignee': '査定担当',
  'phone_contact_person': '電話担当（任意）',
  'preferred_contact_time': '連絡取りやすい日、時間帯',
  'contact_method': '連絡方法',
  'status': '状況（当社）',
  'comments': 'コメント',
  'pinrich_status': 'Pinrich',
  'unreachable_status': '不通',
  'confidence_level': '確度',
  'next_call_date': '次電日',
  'contract_year_month': '契約年月 他決は分かった時点',
  'competitor_name': '競合名',
  'competitor_name_and_reason': '競合名、理由\n（他決、専任）',
  'exclusive_other_decision_factor': '専任・他決要因',
  'visit_notes': '訪問メモ',
  'valuation_method': '査定方法',
};

async function checkAA13508AllFields() {
  console.log('🔍 AA13508の全フィールドを確認中...\n');
  console.log(`📋 ステアリングドキュメントに定義されているフィールド数: ${Object.keys(ALL_FIELDS).length}\n`);

  // 1. スプレッドシートからデータを取得
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = '売主リスト';

  // 全データを取得（A列からZZ列まで）
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A1:ZZ10000`,
  });

  const rows = dataResponse.data.values || [];
  const headers = rows[0] || [];
  
  // AA13508を検索
  let aa13508Row: any = null;
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[0]; // A列が売主番号
    if (sellerNumber === 'AA13508') {
      aa13508Row = {};
      headers.forEach((header: string, index: number) => {
        aa13508Row[header] = row[index] || '';
      });
      rowIndex = i + 1; // 1-indexed
      break;
    }
  }

  if (!aa13508Row) {
    console.log('❌ AA13508はスプレッドシートに存在しません');
    console.log(`📊 スプレッドシートの総行数: ${rows.length}`);
    console.log('\n最新の10件の売主番号:');
    for (let i = Math.max(1, rows.length - 10); i < rows.length; i++) {
      console.log(`  ${i + 1}行目: ${rows[i][0]}`);
    }
    return;
  }

  console.log(`✅ AA13508が見つかりました（${rowIndex}行目）\n`);

  // 2. データベースからデータを取得
  const { data: dbSeller, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13508')
    .single();

  if (error) {
    console.error('❌ データベースエラー:', error);
    return;
  }

  // 3. 全フィールドを比較
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 全フィールドの同期状態:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const missingFields: string[] = [];
  const syncedFields: string[] = [];

  Object.entries(ALL_FIELDS).forEach(([dbField, sheetField]) => {
    const sheetValue = aa13508Row[sheetField];
    const dbValue = dbSeller[dbField];

    // 暗号化フィールドは特別扱い
    const encryptedFields = ['name', 'phone_number', 'email', 'address'];
    
    if (encryptedFields.includes(dbField)) {
      if (sheetValue && dbValue) {
        console.log(`✅ ${dbField}: スプレッドシート「あり」→ DB「暗号化済み」`);
        syncedFields.push(dbField);
      } else if (sheetValue && !dbValue) {
        console.log(`❌ ${dbField}: スプレッドシート「${sheetValue}」→ DB「なし」`);
        missingFields.push(dbField);
      } else {
        // 両方なし
        syncedFields.push(dbField);
      }
    } else {
      if (sheetValue && !dbValue) {
        console.log(`❌ ${dbField}: スプレッドシート「${sheetValue}」→ DB「なし」`);
        missingFields.push(dbField);
      } else if (sheetValue && dbValue) {
        syncedFields.push(dbField);
      }
      // 両方なしの場合はカウントしない
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📈 同期状況サマリー:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ 同期済み: ${syncedFields.length}フィールド`);
  console.log(`❌ 未同期: ${missingFields.length}フィールド`);
  console.log(`📋 総フィールド数: ${Object.keys(ALL_FIELDS).length}フィールド\n`);

  if (missingFields.length > 0) {
    console.log('⚠️ 未同期のフィールド:');
    missingFields.forEach(field => {
      console.log(`  - ${field} (${ALL_FIELDS[field as keyof typeof ALL_FIELDS]})`);
    });
  }
}

checkAA13508AllFields().catch(console.error);
