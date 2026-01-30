import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

async function checkAA13507PhoneContact() {
  console.log('🔍 AA13507の電話担当（任意）フィールドを確認中...\n');

  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // Supabase接続
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. スプレッドシートのヘッダーを取得
    console.log('📋 ステップ1: ヘッダーを確認...');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    const phoneContactIndex = headers.findIndex(h => h === '電話担当（任意）');
    
    if (phoneContactIndex === -1) {
      console.log('❌ 「電話担当（任意）」カラムが見つかりません');
      console.log('📋 利用可能なヘッダー:', headers.slice(0, 50).join(', '));
      return;
    }

    console.log(`✅ 「電話担当（任意）」カラムが見つかりました（列${phoneContactIndex + 1}）\n`);

    // 2. AA13507の行を検索
    console.log('📋 ステップ2: AA13507の行を検索...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:ZZ`,
    });

    const rows = dataResponse.data.values || [];
    const aa13507RowIndex = rows.findIndex(row => row[1] === 'AA13507'); // B列（売主番号）

    if (aa13507RowIndex === -1) {
      console.log('❌ AA13507がスプレッドシートに見つかりません');
      return;
    }

    console.log(`✅ AA13507が見つかりました（行${aa13507RowIndex + 1}）\n`);

    const aa13507Row = rows[aa13507RowIndex];
    const phoneContactValue = aa13507Row[phoneContactIndex];

    // 3. スプレッドシートのデータを表示
    console.log('📊 スプレッドシートのデータ:');
    console.log('売主番号:', aa13507Row[1] || 'なし');
    console.log('名前:', aa13507Row[2] || 'なし');
    console.log('電話担当（任意）:', phoneContactValue || '【空】');
    console.log('');

    // 4. データベースのデータを確認
    console.log('📋 ステップ3: データベースのデータを確認...');
    const { data: dbSeller, error } = await supabase
      .from('sellers')
      .select('seller_number, name, phone_contact_person')
      .eq('seller_number', 'AA13507')
      .single();

    if (error) {
      console.log('❌ データベースエラー:', error.message);
      return;
    }

    if (!dbSeller) {
      console.log('❌ AA13507がデータベースに見つかりません');
      return;
    }

    console.log('📊 データベースのデータ:');
    console.log('売主番号:', dbSeller.seller_number);
    console.log('名前:', dbSeller.name);
    console.log('電話担当（任意）:', dbSeller.phone_contact_person || '【空】');
    console.log('');

    // 5. 比較
    console.log('🔍 比較結果:');
    if (phoneContactValue && !dbSeller.phone_contact_person) {
      console.log('❌ 同期されていません');
      console.log(`   スプレッドシート: "${phoneContactValue}"`);
      console.log(`   データベース: 【空】`);
    } else if (phoneContactValue === dbSeller.phone_contact_person) {
      console.log('✅ 同期されています');
      console.log(`   値: "${phoneContactValue}"`);
    } else if (!phoneContactValue && !dbSeller.phone_contact_person) {
      console.log('ℹ️  両方とも空です');
    } else {
      console.log('⚠️  値が異なります');
      console.log(`   スプレッドシート: "${phoneContactValue || '【空】'}"`);
      console.log(`   データベース: "${dbSeller.phone_contact_person || '【空】'}"`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA13507PhoneContact();
