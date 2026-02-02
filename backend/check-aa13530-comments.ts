import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// .envファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13530Comments() {
  console.log('=== AA13530のコメント状況を確認 ===\n');

  // データベースから取得
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, name, comments, updated_at')
    .eq('seller_number', 'AA13530')
    .single();

  if (error) {
    console.error('❌ エラー:', error);
    return;
  }

  if (!seller) {
    console.log('❌ AA13530が見つかりません');
    return;
  }

  console.log('📊 データベースの状態:');
  console.log('売主番号:', seller.seller_number);
  console.log('名前:', seller.name);
  console.log('コメント:', seller.comments || '(空)');
  console.log('更新日時:', seller.updated_at);
  console.log('');

  // スプレッドシートから取得
  console.log('📋 スプレッドシートを確認中...');
  
  const { google } = await import('googleapis');
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  const SHEET_NAME = '売主リスト';
  
  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!1:1`,
  });
  
  const headers = headerResponse.data.values?.[0] || [];
  const commentColumnIndex = headers.indexOf('コメント');
  
  if (commentColumnIndex === -1) {
    console.log('❌ コメント列が見つかりません');
    return;
  }
  
  console.log(`✅ コメント列: ${String.fromCharCode(65 + commentColumnIndex)}列（インデックス: ${commentColumnIndex}）`);
  
  // 全データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!B:CZ`,
  });
  
  const rows = dataResponse.data.values || [];
  
  // AA13530を検索
  const sellerRow = rows.find(row => row[0] === 'AA13530');
  
  if (!sellerRow) {
    console.log('❌ スプレッドシートにAA13530が見つかりません');
    return;
  }
  
  const commentValue = sellerRow[commentColumnIndex - 1]; // B列から始まるので-1
  
  console.log('');
  console.log('📋 スプレッドシートの状態:');
  console.log('売主番号:', sellerRow[0]);
  console.log('名前:', sellerRow[1]);
  console.log('コメント:', commentValue || '(空)');
  console.log('');
  
  // 比較
  console.log('=== 比較結果 ===');
  if (seller.comments === commentValue) {
    console.log('✅ データベースとスプレッドシートのコメントが一致しています');
  } else {
    console.log('❌ データベースとスプレッドシートのコメントが異なります');
    console.log('');
    console.log('データベース:', seller.comments || '(空)');
    console.log('スプレッドシート:', commentValue || '(空)');
    console.log('');
    console.log('🔄 同期が必要です');
  }
}

checkAA13530Comments().catch(console.error);
