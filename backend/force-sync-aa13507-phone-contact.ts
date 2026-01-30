import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

async function forceSyncAA13507PhoneContact() {
  console.log('🔄 AA13507の電話担当（任意）を強制同期中...\n');

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

    console.log('📊 スプレッドシートの値:', phoneContactValue || '【空】');

    if (!phoneContactValue) {
      console.log('⚠️  スプレッドシートに値がありません。同期をスキップします。');
      return;
    }

    // 3. データベースを更新
    console.log('\n📋 ステップ3: データベースを更新...');
    const { error: updateError } = await supabase
      .from('sellers')
      .update({
        phone_contact_person: String(phoneContactValue),
        updated_at: new Date().toISOString(),
      })
      .eq('seller_number', 'AA13507');

    if (updateError) {
      console.log('❌ 更新エラー:', updateError.message);
      return;
    }

    console.log('✅ データベースを更新しました\n');

    // 4. 確認
    console.log('📋 ステップ4: 更新後のデータを確認...');
    const { data: updatedSeller, error: fetchError } = await supabase
      .from('sellers')
      .select('seller_number, phone_contact_person')
      .eq('seller_number', 'AA13507')
      .single();

    if (fetchError) {
      console.log('❌ 取得エラー:', fetchError.message);
      return;
    }

    console.log('📊 更新後のデータ:');
    console.log('売主番号:', updatedSeller.seller_number);
    console.log('電話担当（任意）:', updatedSeller.phone_contact_person || '【空】');

    if (updatedSeller.phone_contact_person === phoneContactValue) {
      console.log('\n✅ 同期成功！');
    } else {
      console.log('\n⚠️  値が一致しません');
      console.log(`   期待値: "${phoneContactValue}"`);
      console.log(`   実際の値: "${updatedSeller.phone_contact_person || '【空】'}"`);
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

forceSyncAA13507PhoneContact();
