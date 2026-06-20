import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13508FromSheet() {
  console.log('🔍 AA13508をスプレッドシートとデータベースで比較中...\n');

  // 1. スプレッドシートからデータを取得
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const sheetName = '売主リスト';

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!1:1`,
  });

  const headers = headerResponse.data.values?.[0] || [];

  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:ZZ`,
  });

  const rows = dataResponse.data.values || [];
  
  // AA13508を検索（B列が売主番号）
  let aa13508Row: any = null;
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const sellerNumber = row[1]; // B列が売主番号（A列は空列）
    if (sellerNumber === 'AA13508') {
      aa13508Row = {};
      headers.forEach((header: string, index: number) => {
        aa13508Row[header] = row[index] || '';
      });
      break;
    }
  }
  
  if (!aa13508Row) {
    console.log('❌ AA13508はスプレッドシートに存在しません');
    return;
  }

  console.log('✅ スプレッドシートのAA13508:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('売主番号:', aa13508Row['売主番号']);
  console.log('名前:', aa13508Row['名前(漢字のみ）'] || 'なし');
  console.log('電話番号:', aa13508Row['電話番号\nハイフン不要'] || 'なし');
  console.log('メール:', aa13508Row['メールアドレス'] || 'なし');
  console.log('物件所在地:', aa13508Row['物件所在地'] || 'なし');
  console.log('種別:', aa13508Row['種別'] || 'なし');
  console.log('サイト:', aa13508Row['サイト'] || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('査定額1（自動計算）v:', aa13508Row['査定額1（自動計算）v'] || 'なし');
  console.log('査定額2（自動計算）v:', aa13508Row['査定額2（自動計算）v'] || 'なし');
  console.log('査定額3（自動計算）v:', aa13508Row['査定額3（自動計算）v'] || 'なし');
  console.log('査定方法:', aa13508Row['査定方法'] || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('状況（当社）:', aa13508Row['状況（当社）'] || 'なし');
  console.log('不通:', aa13508Row['不通'] || 'なし');
  console.log('確度:', aa13508Row['確度'] || 'なし');
  console.log('コメント:', aa13508Row['コメント'] || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('訪問日:', aa13508Row['訪問日 \nY/M/D'] || 'なし');
  console.log('営担:', aa13508Row['営担'] || 'なし');
  console.log('電話担当:', aa13508Row['電話担当（任意）'] || 'なし');
  console.log('連絡取りやすい日、時間帯:', aa13508Row['連絡取りやすい日、時間帯'] || 'なし');
  console.log('連絡方法:', aa13508Row['連絡方法'] || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

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

  console.log('✅ データベースのAA13508:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('売主番号:', dbSeller.seller_number);
  console.log('名前:', dbSeller.name ? '(暗号化済み)' : 'なし');
  console.log('電話番号:', dbSeller.phone_number ? '(暗号化済み)' : 'なし');
  console.log('メール:', dbSeller.email ? '(暗号化済み)' : 'なし');
  console.log('物件所在地:', dbSeller.property_address || 'なし');
  console.log('種別:', dbSeller.property_type || 'なし');
  console.log('サイト:', dbSeller.inquiry_site || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('査定額1:', dbSeller.valuation_amount_1 ? `${dbSeller.valuation_amount_1.toLocaleString()}円` : 'なし');
  console.log('査定額2:', dbSeller.valuation_amount_2 ? `${dbSeller.valuation_amount_2.toLocaleString()}円` : 'なし');
  console.log('査定額3:', dbSeller.valuation_amount_3 ? `${dbSeller.valuation_amount_3.toLocaleString()}円` : 'なし');
  console.log('査定方法:', dbSeller.valuation_method || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('状況（当社）:', dbSeller.status || 'なし');
  console.log('不通:', dbSeller.unreachable_status || 'なし');
  console.log('確度:', dbSeller.confidence_level || 'なし');
  console.log('コメント:', dbSeller.comments || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('訪問日:', dbSeller.visit_date || 'なし');
  console.log('営担:', dbSeller.visit_assignee || 'なし');
  console.log('電話担当:', dbSeller.phone_contact_person || 'なし');
  console.log('連絡取りやすい日、時間帯:', dbSeller.preferred_contact_time || 'なし');
  console.log('連絡方法:', dbSeller.contact_method || 'なし');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 3. 差分を確認
  console.log('⚠️ 同期されていないフィールド:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const missingFields: string[] = [];
  
  if (aa13508Row['物件所在地'] && !dbSeller.property_address) {
    console.log('❌ 物件所在地: スプレッドシート「' + aa13508Row['物件所在地'] + '」→ DB「なし」');
    missingFields.push('property_address');
  }
  
  if (aa13508Row['査定方法'] && !dbSeller.valuation_method) {
    console.log('❌ 査定方法: スプレッドシート「' + aa13508Row['査定方法'] + '」→ DB「なし」');
    missingFields.push('valuation_method');
  }
  
  if (aa13508Row['電話担当（任意）'] && !dbSeller.phone_contact_person) {
    console.log('❌ 電話担当: スプレッドシート「' + aa13508Row['電話担当（任意）'] + '」→ DB「なし」');
    missingFields.push('phone_contact_person');
  }
  
  if (aa13508Row['連絡取りやすい日、時間帯'] && !dbSeller.preferred_contact_time) {
    console.log('❌ 連絡取りやすい日、時間帯: スプレッドシート「' + aa13508Row['連絡取りやすい日、時間帯'] + '」→ DB「なし」');
    missingFields.push('preferred_contact_time');
  }
  
  if (aa13508Row['連絡方法'] && !dbSeller.contact_method) {
    console.log('❌ 連絡方法: スプレッドシート「' + aa13508Row['連絡方法'] + '」→ DB「なし」');
    missingFields.push('contact_method');
  }
  
  if (aa13508Row['不通'] && !dbSeller.unreachable_status) {
    console.log('❌ 不通: スプレッドシート「' + aa13508Row['不通'] + '」→ DB「なし」');
    missingFields.push('unreachable_status');
  }
  
  if (aa13508Row['確度'] && !dbSeller.confidence_level) {
    console.log('❌ 確度: スプレッドシート「' + aa13508Row['確度'] + '」→ DB「なし」');
    missingFields.push('confidence_level');
  }
  
  if (aa13508Row['コメント'] && !dbSeller.comments) {
    console.log('❌ コメント: スプレッドシート「' + aa13508Row['コメント'] + '」→ DB「なし」');
    missingFields.push('comments');
  }
  
  if (missingFields.length === 0) {
    console.log('✅ 全てのフィールドが同期されています');
  } else {
    console.log('\n📝 同期が必要なフィールド数:', missingFields.length);
    console.log('フィールド:', missingFields.join(', '));
  }
}

checkAA13508FromSheet().catch(console.error);
