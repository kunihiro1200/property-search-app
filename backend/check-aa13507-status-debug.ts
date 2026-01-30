import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';

// .env.localを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

async function checkAA13507StatusDebug() {
  console.log('🔍 AA13507のステータス判定に必要なフィールドを確認中...\n');

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
    
    // 必要なカラムのインデックスを取得
    const columnIndices: Record<string, number> = {};
    const columnsToFind = [
      '売主番号',
      '電話担当（任意）',
      '連絡方法',
      '連絡取りやすい日、時間帯',
      '次電日',
      '状況（当社）',
      '査定方法',
      'Pinrich',
    ];

    columnsToFind.forEach(col => {
      const index = headers.findIndex((h: string) => h === col);
      if (index !== -1) {
        columnIndices[col] = index;
        console.log(`✅ 「${col}」カラムが見つかりました（列${index + 1}）`);
      } else {
        console.log(`❌ 「${col}」カラムが見つかりません`);
      }
    });

    console.log('');

    // 2. AA13507の行を検索
    console.log('📋 ステップ2: AA13507の行を検索...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!B:CZ`,
    });

    const rows = dataResponse.data.values || [];
    const aa13507RowIndex = rows.findIndex(row => row[0] === 'AA13507'); // B列（売主番号）

    if (aa13507RowIndex === -1) {
      console.log('❌ AA13507がスプレッドシートに見つかりません');
      return;
    }

    console.log(`✅ AA13507が見つかりました（行${aa13507RowIndex + 2}）\n`);

    const aa13507Row = rows[aa13507RowIndex];

    // 3. スプレッドシートのデータを表示
    console.log('📊 スプレッドシートのデータ:');
    console.log('売主番号:', aa13507Row[0] || 'なし');
    
    // B列からの相対位置で取得（B列が0番目）
    const phoneContactIndex = columnIndices['電話担当（任意）'] - 1; // B列からの相対位置
    const contactMethodIndex = columnIndices['連絡方法'] - 1;
    const preferredTimeIndex = columnIndices['連絡取りやすい日、時間帯'] - 1;
    const nextCallDateIndex = columnIndices['次電日'] - 1;
    const statusIndex = columnIndices['状況（当社）'] - 1;
    const valuationMethodIndex = columnIndices['査定方法'] - 1;
    const pinrichIndex = columnIndices['Pinrich'] - 1;

    console.log('電話担当（任意）:', aa13507Row[phoneContactIndex] || '【空】');
    console.log('連絡方法:', aa13507Row[contactMethodIndex] || '【空】');
    console.log('連絡取りやすい日、時間帯:', aa13507Row[preferredTimeIndex] || '【空】');
    console.log('次電日:', aa13507Row[nextCallDateIndex] || '【空】');
    console.log('状況（当社）:', aa13507Row[statusIndex] || '【空】');
    console.log('査定方法:', aa13507Row[valuationMethodIndex] || '【空】');
    console.log('Pinrich:', aa13507Row[pinrichIndex] || '【空】');
    console.log('');

    // 4. データベースのデータを確認
    console.log('📋 ステップ3: データベースのデータを確認...');
    const { data: dbSeller, error } = await supabase
      .from('sellers')
      .select('seller_number, phone_contact_person, contact_method, preferred_contact_time, next_call_date, status, valuation_method, pinrich_status')
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
    console.log('電話担当（任意）:', dbSeller.phone_contact_person || '【空】');
    console.log('連絡方法:', dbSeller.contact_method || '【空】');
    console.log('連絡取りやすい日、時間帯:', dbSeller.preferred_contact_time || '【空】');
    console.log('次電日:', dbSeller.next_call_date || '【空】');
    console.log('状況（当社）:', dbSeller.status || '【空】');
    console.log('査定方法:', dbSeller.valuation_method || '【空】');
    console.log('Pinrich:', dbSeller.pinrich_status || '【空】');
    console.log('');

    // 5. ステータス判定ロジックをシミュレート
    console.log('📋 ステップ4: ステータス判定ロジックをシミュレート...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const nextCallDate = dbSeller.next_call_date ? new Date(dbSeller.next_call_date) : null;
    if (nextCallDate) {
      nextCallDate.setHours(0, 0, 0, 0);
    }
    
    const isNextCallDateToday = nextCallDate && nextCallDate <= today;
    const contactMethod = dbSeller.contact_method;
    const preferredContactTime = dbSeller.preferred_contact_time;
    const phoneContactPerson = dbSeller.phone_contact_person;
    const status = dbSeller.status;
    const isFollowingUp = status && status.includes('追客中');

    console.log('');
    console.log('🔍 判定条件:');
    console.log(`  今日の日付: ${today.toISOString().split('T')[0]}`);
    console.log(`  次電日: ${nextCallDate ? nextCallDate.toISOString().split('T')[0] : 'なし'}`);
    console.log(`  次電日が今日以前: ${isNextCallDateToday ? 'はい' : 'いいえ'}`);
    console.log(`  連絡方法: "${contactMethod || ''}"`);
    console.log(`  連絡取りやすい時間: "${preferredContactTime || ''}"`);
    console.log(`  電話担当（任意）: "${phoneContactPerson || ''}"`);
    console.log(`  状況（当社）: "${status || ''}"`);
    console.log(`  追客中を含む: ${isFollowingUp ? 'はい' : 'いいえ'}`);
    console.log('');

    // 6. 期待されるステータスを計算
    console.log('📋 ステップ5: 期待されるステータス...');
    
    if (!isFollowingUp) {
      console.log('❌ 「追客中」を含まないため、ステータスは表示されません');
      return;
    }

    // 優先順位1: 当日TEL(連絡方法)
    if (contactMethod && contactMethod.trim() !== '' && isNextCallDateToday) {
      console.log(`✅ 期待されるステータス: 当日TEL(${contactMethod})`);
      console.log('   理由: 連絡方法に入力があり、次電日が今日以前');
    }
    // 優先順位2: 当日TEL(連絡取りやすい時間)
    else if (preferredContactTime && preferredContactTime.trim() !== '' && isNextCallDateToday) {
      console.log(`✅ 期待されるステータス: 当日TEL(${preferredContactTime})`);
      console.log('   理由: 連絡取りやすい時間に入力があり、次電日が今日以前');
    }
    // 優先順位5: 当日TEL分
    else if (isNextCallDateToday) {
      if (phoneContactPerson && phoneContactPerson.trim() !== '') {
        console.log(`✅ 期待されるステータス: 当日TEL分（${phoneContactPerson}）`);
        console.log('   理由: 次電日が今日以前、電話担当に入力あり');
      } else {
        console.log('✅ 期待されるステータス: 当日TEL分');
        console.log('   理由: 次電日が今日以前');
      }
    } else {
      console.log('ℹ️  当日TEL関連のステータスは表示されません');
      console.log('   理由: 次電日が今日より後、または設定されていない');
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkAA13507StatusDebug();
