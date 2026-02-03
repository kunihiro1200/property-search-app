import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { google } from 'googleapis';
import * as path from 'path';

// .env.localを読み込み
const envPath = path.join(__dirname, '.env.local');
console.log('Loading .env.local from:', envPath);
dotenv.config({ path: envPath });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SERVICE_ACCOUNT_KEY_PATH = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!;

async function checkAA13533SyncStatus() {
  console.log('🔍 AA13533の同期状況を確認中...\n');

  // 1. データベースから取得
  console.log('📊 データベースから取得:');
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('seller_number, unreachable_status, is_unreachable, status, next_call_date, contact_method, preferred_contact_time, phone_contact_person, visit_assignee')
    .eq('seller_number', 'AA13533')
    .single();

  if (dbError) {
    console.error('❌ データベースエラー:', dbError);
    return;
  }

  if (!dbSeller) {
    console.log('❌ AA13533がデータベースに存在しません');
    return;
  }

  console.log('  売主番号:', dbSeller.seller_number);
  console.log('  不通ステータス (unreachable_status):', dbSeller.unreachable_status || '(空)');
  console.log('  不通フラグ (is_unreachable):', dbSeller.is_unreachable);
  console.log('  状況（当社）:', dbSeller.status);
  console.log('  次電日:', dbSeller.next_call_date);
  console.log('  連絡方法:', dbSeller.contact_method || '(空)');
  console.log('  連絡取りやすい時間:', dbSeller.preferred_contact_time || '(空)');
  console.log('  電話担当:', dbSeller.phone_contact_person || '(空)');
  console.log('  営担:', dbSeller.visit_assignee || '(空)');

  // 2. スプレッドシートから取得
  console.log('\n📋 スプレッドシートから取得:');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!1:1',
  });

  const headers = headerResponse.data.values?.[0] || [];
  const sellerNumberIndex = headers.indexOf('売主番号');
  const unreachableIndex = headers.indexOf('不通');
  const statusIndex = headers.indexOf('状況（当社）');
  const nextCallDateIndex = headers.indexOf('次電日');
  const contactMethodIndex = headers.indexOf('連絡方法');
  const preferredContactTimeIndex = headers.indexOf('連絡取りやすい日、時間帯');
  const phoneContactPersonIndex = headers.indexOf('電話担当（任意）');
  const visitAssigneeIndex = headers.indexOf('営担');

  console.log('  カラムインデックス:');
  console.log('    売主番号:', sellerNumberIndex);
  console.log('    不通:', unreachableIndex);
  console.log('    状況（当社）:', statusIndex);
  console.log('    次電日:', nextCallDateIndex);
  console.log('    連絡方法:', contactMethodIndex);
  console.log('    連絡取りやすい日、時間帯:', preferredContactTimeIndex);
  console.log('    電話担当（任意）:', phoneContactPersonIndex);
  console.log('    営担:', visitAssigneeIndex);

  // AA13533を検索
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:B',
  });

  const sellerNumbers = dataResponse.data.values || [];
  const rowIndex = sellerNumbers.findIndex(row => row[0] === 'AA13533');

  if (rowIndex === -1) {
    console.log('\n❌ AA13533がスプレッドシートに存在しません');
    return;
  }

  const actualRowNumber = rowIndex + 1; // 1-indexed
  console.log(`\n  行番号: ${actualRowNumber}`);

  // 該当行のデータを取得
  const rowResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `売主リスト!${actualRowNumber}:${actualRowNumber}`,
  });

  const rowData = rowResponse.data.values?.[0] || [];

  console.log('  売主番号:', rowData[sellerNumberIndex] || '(空)');
  console.log('  不通:', rowData[unreachableIndex] || '(空)');
  console.log('  状況（当社）:', rowData[statusIndex] || '(空)');
  console.log('  次電日:', rowData[nextCallDateIndex] || '(空)');
  console.log('  連絡方法:', rowData[contactMethodIndex] || '(空)');
  console.log('  連絡取りやすい日、時間帯:', rowData[preferredContactTimeIndex] || '(空)');
  console.log('  電話担当（任意）:', rowData[phoneContactPersonIndex] || '(空)');
  console.log('  営担:', rowData[visitAssigneeIndex] || '(空)');

  // 3. 比較
  console.log('\n🔍 比較結果:');
  const sheetUnreachable = rowData[unreachableIndex] || '';
  const dbUnreachable = dbSeller.unreachable_status || '';

  if (sheetUnreachable !== dbUnreachable) {
    console.log('  ❌ 不通フィールドが一致しません:');
    console.log(`     スプレッドシート: "${sheetUnreachable}"`);
    console.log(`     データベース: "${dbUnreachable}"`);
  } else {
    console.log('  ✅ 不通フィールドが一致しています');
  }

  // 4. サイドバーカテゴリーの判定
  console.log('\n📊 サイドバーカテゴリーの判定:');
  
  const hasContactInfo = !!(dbSeller.contact_method || dbSeller.preferred_contact_time || dbSeller.phone_contact_person);
  const hasVisitAssignee = !!dbSeller.visit_assignee && dbSeller.visit_assignee !== '外す';
  const isFollowingUp = dbSeller.status?.includes('追客中');
  const nextCallDate = dbSeller.next_call_date ? new Date(dbSeller.next_call_date) : null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isTodayOrBefore = nextCallDate ? nextCallDate <= today : false;

  console.log('  追客中:', isFollowingUp);
  console.log('  次電日が今日以前:', isTodayOrBefore);
  console.log('  コミュニケーション情報あり:', hasContactInfo);
  console.log('  営担あり:', hasVisitAssignee);

  if (hasVisitAssignee && isTodayOrBefore) {
    console.log('  → カテゴリー: 当日TEL（担当）');
  } else if (isFollowingUp && isTodayOrBefore && hasContactInfo && !hasVisitAssignee) {
    console.log('  → カテゴリー: コミュニケーション情報別カテゴリ');
  } else if (isFollowingUp && isTodayOrBefore && !hasContactInfo && !hasVisitAssignee) {
    console.log('  → カテゴリー: 当日TEL分');
  } else {
    console.log('  → カテゴリー: その他');
  }
}

checkAA13533SyncStatus().catch(console.error);
