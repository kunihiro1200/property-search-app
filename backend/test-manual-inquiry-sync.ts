import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function testManualInquirySync() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== 最新のfailed問合せを手動同期 ===\n');

  // failed状態の最新の問合せを取得
  const { data: failedInquiry, error } = await supabase
    .from('property_inquiries')
    .select('*')
    .eq('sheet_sync_status', 'failed')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!failedInquiry) {
    console.log('failed状態の問合せが見つかりません');
    return;
  }

  console.log('問合せ情報:');
  console.log('- ID:', failedInquiry.id);
  console.log('- 名前:', failedInquiry.name);
  console.log('- 買主番号:', failedInquiry.buyer_number);
  console.log('- 物件番号:', failedInquiry.property_number || '(なし)');
  console.log('');

  // Google Sheets認証
  console.log('Google Sheets認証中...');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
    serviceAccountKeyPath: './google-service-account.json', // ローカル環境用
  });

  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');

  // 電話番号を正規化
  const normalizedPhone = failedInquiry.phone.replace(/[^0-9]/g, '');

  // 現在時刻をJST（日本時間）で取得
  const nowUtc = new Date(failedInquiry.created_at);
  const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
  const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);

  // 受付日（今日の日付、YYYY/MM/DD形式）
  const receptionDate = jstDate.toISOString().substring(0, 10).replace(/-/g, '/');

  // スプレッドシートに追加
  const rowData = {
    '買主番号': failedInquiry.buyer_number.toString(),
    '作成日時': jstDateString,
    '●氏名・会社名': failedInquiry.name,
    '●問合時ヒアリング': failedInquiry.message,
    '●電話番号\n（ハイフン不要）': normalizedPhone,
    '受付日': receptionDate,
    '●メアド': failedInquiry.email,
    '●問合せ元': 'いふう独自サイト',
    '物件番号': failedInquiry.property_number || '',
    '【問合メール】電話対応': '未',
  };

  console.log('スプレッドシートに追加するデータ:');
  console.log(JSON.stringify(rowData, null, 2));
  console.log('');

  console.log('スプレッドシートに追加中...');
  await sheetsClient.appendRow(rowData);
  console.log('✅ スプレッドシートに追加成功\n');

  // データベースを更新
  console.log('データベースを更新中...');
  await supabase
    .from('property_inquiries')
    .update({ sheet_sync_status: 'synced' })
    .eq('id', failedInquiry.id);

  console.log('✅ データベース更新成功\n');
  console.log('=== 手動同期完了 ===');
}

testManualInquirySync().catch(console.error);
