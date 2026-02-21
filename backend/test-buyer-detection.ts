import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * 買主6941がスプレッドシートに存在するかを確認するテスト
 * 実際の自動同期と同じロジックでテスト
 */
async function testBuyerDetection() {
  console.log('=== 買主6941の検出テスト ===\n');

  // Google Sheets APIの初期化
  const { google } = require('googleapis');
  
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('❌ GOOGLE_SERVICE_ACCOUNT_KEY が設定されていません');
    return;
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.BUYER_SPREADSHEET_ID;
  const sheetName = process.env.BUYER_SHEET_NAME || '買主リスト';

  console.log('スプレッドシートID:', spreadsheetId);
  console.log('シート名:', sheetName);

  // 1. スプレッドシートからデータを取得
  console.log('\n🔍 スプレッドシートからデータを取得中...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:Z`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    console.log('❌ スプレッドシートにデータがありません');
    return;
  }

  const headers = rows[0];
  const buyerNumberIndex = headers.indexOf('買主番号');
  
  if (buyerNumberIndex === -1) {
    console.log('❌ 「買主番号」カラムが見つかりません');
    return;
  }

  console.log(`✅ スプレッドシートから${rows.length - 1}行のデータを取得`);
  console.log(`   買主番号カラムのインデックス: ${buyerNumberIndex}`);

  // 2. 買主6941を検索（旧ロジック - typeof === 'string'）
  console.log('\n🔍 旧ロジックで買主6941を検索（typeof === "string"）...');
  let found6941Old = false;
  let buyer6941DataOld: any = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (buyerNumber && typeof buyerNumber === 'string') {
      if (buyerNumber === '6941') {
        found6941Old = true;
        buyer6941DataOld = buyerNumber;
        console.log(`✅ 旧ロジック: 買主6941が見つかりました（行${i + 1}）`);
        console.log(`   値: "${buyerNumber}"`);
        console.log(`   型: ${typeof buyerNumber}`);
        break;
      }
    }
  }

  if (!found6941Old) {
    console.log('❌ 旧ロジック: 買主6941が見つかりませんでした');
  }

  // 3. 買主6941を検索（新ロジック - String().trim()）
  console.log('\n🔍 新ロジックで買主6941を検索（String().trim()）...');
  let found6941New = false;
  let buyer6941DataNew: any = null;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (buyerNumber !== null && buyerNumber !== undefined && buyerNumber !== '') {
      const buyerNumberStr = String(buyerNumber).trim();
      if (buyerNumberStr === '6941') {
        found6941New = true;
        buyer6941DataNew = buyerNumber;
        console.log(`✅ 新ロジック: 買主6941が見つかりました（行${i + 1}）`);
        console.log(`   元の値: "${buyerNumber}"`);
        console.log(`   元の型: ${typeof buyerNumber}`);
        console.log(`   変換後: "${buyerNumberStr}"`);
        break;
      }
    }
  }

  if (!found6941New) {
    console.log('❌ 新ロジック: 買主6941が見つかりませんでした');
  }

  // 4. 全買主番号の型を確認（最初の10件）
  console.log('\n📊 買主番号の型を確認（最初の10件）:');
  for (let i = 1; i < Math.min(11, rows.length); i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    console.log(`   行${i + 1}: 値="${buyerNumber}", 型=${typeof buyerNumber}`);
  }

  // 5. 結論
  console.log('\n=== 結論 ===');
  if (found6941Old && found6941New) {
    console.log('✅ 旧ロジックでも新ロジックでも買主6941が見つかりました');
    console.log('   → 型チェックの問題ではありません');
  } else if (!found6941Old && found6941New) {
    console.log('⚠️  旧ロジックでは見つからず、新ロジックで見つかりました');
    console.log('   → 型チェックの問題が原因です（修正が必要）');
  } else if (!found6941Old && !found6941New) {
    console.log('❌ 両方のロジックで買主6941が見つかりませんでした');
    console.log('   → スプレッドシートに存在しない可能性があります');
  }
}

testBuyerDetection().catch(console.error);
