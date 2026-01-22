import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function syncAA13423() {
  const targetSellerNumber = 'AA13423';
  
  console.log(`🎯 ${targetSellerNumber}のみを同期します\n`);

  // 1. スプレッドシートからデータを取得
  console.log('📊 ステップ1: スプレッドシートからデータを取得...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const rows = await sheetsClient.readAll();
  
  const targetRow = rows.find(row => row['売主番号'] === targetSellerNumber);
  
  if (!targetRow) {
    console.error(`❌ スプレッドシートに${targetSellerNumber}が見つかりません`);
    return;
  }

  const inquiryYear = targetRow['反響年'];
  const inquirySite = targetRow['サイト'];
  const inquiryDate = targetRow['反響日付'];
  const comments = targetRow['コメント'];
  
  console.log(`✅ スプレッドシートから取得:`);
  console.log(`   反響年: ${inquiryYear || '(空)'}`);
  console.log(`   サイト: ${inquirySite || '(空)'}`);
  console.log(`   反響日付: ${inquiryDate || '(空)'}`);
  console.log(`   コメント: ${comments ? comments.substring(0, 50) + '...' : '(空)'}`);
  console.log('');

  // 2. データベースの現在の状態を確認
  console.log('📊 ステップ2: データベースの現在の状態を確認...');
  const { data: beforeSeller, error: beforeError } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_year, inquiry_site, inquiry_date, comments')
    .eq('seller_number', targetSellerNumber)
    .single();

  if (beforeError || !beforeSeller) {
    console.error(`❌ データベースに${targetSellerNumber}が見つかりません`);
    return;
  }

  console.log(`✅ 更新前のデータベース:`);
  console.log(`   ID: ${beforeSeller.id}`);
  console.log(`   inquiry_year: ${beforeSeller.inquiry_year || '(null)'}`);
  console.log(`   inquiry_site: ${beforeSeller.inquiry_site || '(null)'}`);
  console.log(`   inquiry_date: ${beforeSeller.inquiry_date || '(null)'}`);
  console.log(`   comments: ${beforeSeller.comments ? beforeSeller.comments.substring(0, 50) + '...' : '(null)'}`);
  console.log('');

  // 3. データベースを更新
  console.log('📊 ステップ3: データベースを更新...');
  const updates: any = {};
  if (inquiryYear) updates.inquiry_year = inquiryYear;
  if (inquirySite) updates.inquiry_site = inquirySite;
  if (inquiryDate) {
    // 日付を解析（MM/DD形式）
    const [month, day] = inquiryDate.split('/');
    const year = inquiryYear || new Date().getFullYear();
    updates.inquiry_date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  if (comments) updates.comments = comments;

  if (Object.keys(updates).length === 0) {
    console.log('⚠️  更新するデータがありません');
    return;
  }

  const { error: updateError } = await supabase
    .from('sellers')
    .update(updates)
    .eq('id', beforeSeller.id);

  if (updateError) {
    console.error(`❌ 更新エラー:`, updateError);
    return;
  }

  console.log(`✅ データベースを更新しました:`, updates);
  console.log('');

  // 4. 更新後のデータベースを確認
  console.log('📊 ステップ4: 更新後のデータベースを確認...');
  const { data: afterSeller, error: afterError } = await supabase
    .from('sellers')
    .select('id, seller_number, inquiry_year, inquiry_site, inquiry_date, comments')
    .eq('seller_number', targetSellerNumber)
    .single();

  if (afterError || !afterSeller) {
    console.error(`❌ 更新後のデータ取得エラー`);
    return;
  }

  console.log(`✅ 更新後のデータベース:`);
  console.log(`   inquiry_year: ${afterSeller.inquiry_year || '(null)'}`);
  console.log(`   inquiry_site: ${afterSeller.inquiry_site || '(null)'}`);
  console.log(`   inquiry_date: ${afterSeller.inquiry_date || '(null)'}`);
  console.log(`   comments: ${afterSeller.comments ? afterSeller.comments.substring(0, 50) + '...' : '(null)'}`);
  console.log('');

  console.log('🎉 同期完了！');
  console.log('');
  console.log('次のステップ:');
  console.log('1. ブラウザで売主詳細画面をリロード（F5）');
  console.log(`2. ${targetSellerNumber}の詳細画面を開く`);
  console.log('3. 「反響年」「反響日付」「サイト」「コメント」が表示されているか確認');
}

syncAA13423()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
