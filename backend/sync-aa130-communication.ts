/**
 * AA130のコミュニケーション情報を手動同期
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function syncAA130Communication() {
  console.log('=== AA130 コミュニケーション情報を同期 ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!1:1",
  });
  const headers = headerResponse.data.values?.[0] || [];

  // AA130の行を取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!A2:ZZZ",
  });
  const rows = dataResponse.data.values || [];

  // AA130を探す（B列で検索）
  const aa130Row = rows.find(row => row[1] === 'AA130');
  if (!aa130Row) {
    console.log('AA130が見つかりません');
    return;
  }

  // rowToObjectのシミュレーション
  const obj: any = {};
  headers.forEach((header: string, index: number) => {
    const value = aa130Row[index];
    obj[header] = value !== undefined && value !== '' ? value : null;
  });

  // コミュニケーション情報を取得
  const phoneContactPerson = obj['電話担当（任意）'];
  const preferredContactTime = obj['連絡取りやすい日、時間帯'];
  const contactMethod = obj['連絡方法'];

  console.log('スプレッドシートの値:');
  console.log('  電話担当:', phoneContactPerson || '(空)');
  console.log('  連絡取りやすい時間:', preferredContactTime || '(空)');
  console.log('  連絡方法:', contactMethod || '(空)');

  // データベースを更新
  const updateData: any = {};
  if (phoneContactPerson) {
    updateData.phone_contact_person = String(phoneContactPerson);
  }
  if (preferredContactTime) {
    updateData.preferred_contact_time = String(preferredContactTime);
  }
  if (contactMethod) {
    updateData.contact_method = String(contactMethod);
  }

  console.log('\n更新データ:', updateData);

  const { error } = await supabase
    .from('sellers')
    .update(updateData)
    .eq('seller_number', 'AA130');

  if (error) {
    console.error('更新エラー:', error.message);
    return;
  }

  console.log('\n✅ 更新完了');

  // 確認
  const { data: seller } = await supabase
    .from('sellers')
    .select('seller_number, phone_contact_person, preferred_contact_time, contact_method')
    .eq('seller_number', 'AA130')
    .single();

  console.log('\n更新後のデータベースの状態:');
  console.log('  電話担当:', seller?.phone_contact_person || '(空)');
  console.log('  連絡取りやすい時間:', seller?.preferred_contact_time || '(空)');
  console.log('  連絡方法:', seller?.contact_method || '(空)');

  console.log('\n=== 同期完了 ===');
}

syncAA130Communication().catch(console.error);
