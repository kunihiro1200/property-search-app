import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

const SPREADSHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
const SHEET_NAME = '業務依頼';
const PROPERTY_NUMBER = 'AA1821';

async function main() {
  console.log('🔍 AA1821のデータ同期状況を確認します...\n');

  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Google Sheets APIクライアント
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_PATH || 'google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1. データベースからデータを取得
    console.log('📊 データベースからデータを取得中...');
    const { data: dbData, error: dbError } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', PROPERTY_NUMBER)
      .single();

    if (dbError) {
      console.error('❌ データベースエラー:', dbError.message);
      return;
    }

    if (!dbData) {
      console.log('❌ データベースにAA1821が見つかりません');
      return;
    }

    console.log('✅ データベースからデータを取得しました\n');

    // 2. スプレッドシートからデータを取得
    console.log('📋 スプレッドシートからデータを取得中...');
    
    // ヘッダー行を取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];

    // データ行を取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!2:1000`,
    });
    const rows = dataResponse.data.values || [];

    // 物件番号のカラムインデックスを取得
    const propertyNumberIndex = headers.indexOf('物件番号');
    if (propertyNumberIndex === -1) {
      console.error('❌ 物件番号カラムが見つかりません');
      return;
    }

    // AA1821の行を検索
    const targetRow = rows.find(row => row[propertyNumberIndex] === PROPERTY_NUMBER);
    if (!targetRow) {
      console.log('❌ スプレッドシートにAA1821が見つかりません');
      return;
    }

    // 行データをオブジェクトに変換
    const sheetRow: Record<string, any> = {};
    headers.forEach((header: string, index: number) => {
      sheetRow[header] = targetRow[index] || '';
    });

    console.log('✅ スプレッドシートからデータを取得しました\n');

    // 3. 重要なフィールドを比較
    console.log('🔍 重要なフィールドの比較:\n');

    const fieldsToCheck = [
      { sheet: 'サイト登録締め日', db: 'site_registration_deadline' },
      { sheet: 'サイト登録依頼日', db: 'site_registration_request_date' },
      { sheet: 'サイト登録納期予定日', db: 'site_registration_due_date' },
      { sheet: 'サイト登録確認依頼日', db: 'site_registration_confirm_request_date' },
      { sheet: 'サイト登録確認', db: 'site_registration_confirmed' },
      { sheet: 'サイト登録確認者', db: 'site_registration_confirmer' },
      { sheet: '配信日', db: 'distribution_date' },
      { sheet: 'メール配信', db: 'email_distribution' },
      { sheet: '公開予定日', db: 'publish_scheduled_date' },
      { sheet: '決済日', db: 'settlement_date' },
      { sheet: '決済予定月', db: 'settlement_scheduled_month' },
    ];

    let hasDifference = false;

    for (const field of fieldsToCheck) {
      const sheetValue = sheetRow[field.sheet] || '';
      const dbValue = dbData[field.db] || '';

      // 日付形式を正規化して比較
      const normalizeDate = (value: string): string => {
        if (!value) return '';
        // YYYY/MM/DD形式をYYYY-MM-DD形式に変換
        if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(value)) {
          const datePart = value.split(' ')[0];
          const parts = datePart.split('/');
          const year = parts[0];
          const month = parts[1].padStart(2, '0');
          const day = parts[2].padStart(2, '0');
          return `${year}-${month}-${day}`;
        }
        return value;
      };

      const normalizedSheetValue = normalizeDate(sheetValue);
      const normalizedDbValue = normalizeDate(dbValue);

      const match = normalizedSheetValue === normalizedDbValue || (!normalizedSheetValue && !normalizedDbValue);

      if (!match) {
        hasDifference = true;
        console.log(`❌ ${field.sheet}:`);
        console.log(`   スプレッドシート: "${sheetValue}" (正規化: "${normalizedSheetValue}")`);
        console.log(`   データベース: "${dbValue}" (正規化: "${normalizedDbValue}")`);
        console.log('');
      } else {
        console.log(`✅ ${field.sheet}: "${sheetValue}" → "${dbValue}"`);
      }
    }

    if (!hasDifference) {
      console.log('\n✅ 全てのフィールドが一致しています');
    } else {
      console.log('\n⚠️ 一部のフィールドが一致していません');
      console.log('\n💡 解決方法:');
      console.log('   1. 手動同期を実行: npx ts-node backend/sync-work-tasks.ts');
      console.log('   2. 特定物件のみ同期: curl -X POST http://localhost:3001/api/work-tasks/sync/AA1821');
    }

    // 4. 最終同期日時を表示
    console.log('\n📅 最終同期日時:');
    console.log(`   ${dbData.synced_at || '未同期'}`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

main();
