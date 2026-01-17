import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAA13423Comments() {
  const targetSellerNumber = 'AA13423';
  
  console.log(`📝 ${targetSellerNumber}のコメントを確認\n`);

  // 1. スプレッドシートからコメントを取得
  console.log('📊 スプレッドシートからコメントを取得...');
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

  // すべてのカラム名を表示（コメント関連）
  console.log('📋 コメント関連のカラム:');
  const columnNames = Object.keys(targetRow);
  columnNames.forEach((name, index) => {
    if (name.includes('コメント') || name.includes('メモ') || name.includes('備考')) {
      console.log(`   ${index + 1}. "${name}": ${targetRow[name] || '(空)'}`);
    }
  });
  console.log('');

  // 2. データベースのコメントを確認
  console.log('📊 データベースのコメントを確認...');
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('id, seller_number, comments')
    .eq('seller_number', targetSellerNumber)
    .single();

  if (error || !seller) {
    console.error(`❌ データベースに${targetSellerNumber}が見つかりません`);
    return;
  }

  console.log(`✅ データベースのコメント:`);
  console.log(`   comments: ${seller.comments || '(null)'}`);
  console.log('');

  // 3. column-mappingを確認
  console.log('📋 column-mapping.jsonの確認が必要です');
  console.log('   スプレッドシートの「コメント」カラムがcommentsフィールドにマッピングされているか確認してください');
}

checkAA13423Comments()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
