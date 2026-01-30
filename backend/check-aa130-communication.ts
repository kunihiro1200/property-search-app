/**
 * AA130のコミュニケーション情報を調査
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA130Communication() {
  console.log('=== AA130 コミュニケーション情報調査 ===\n');

  // 1. データベースの状態を確認
  console.log('1. データベースの状態:');
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('seller_number, phone_contact_person, preferred_contact_time, contact_method')
    .eq('seller_number', 'AA130')
    .single();

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('  seller_number:', seller?.seller_number);
  console.log('  phone_contact_person:', seller?.phone_contact_person || '(空)');
  console.log('  preferred_contact_time:', seller?.preferred_contact_time || '(空)');
  console.log('  contact_method:', seller?.contact_method || '(空)');

  // 2. スプレッドシートの状態を確認
  console.log('\n2. スプレッドシートの状態:');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];

  // AA130の行を検索（B列で検索）
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];

  // AA130を探す
  const aa130Row = rows.find(row => row[0] === 'AA130');
  
  if (!aa130Row) {
    console.log('  AA130がスプレッドシートに見つかりません');
    return;
  }

  // コミュニケーション関連のカラムを探す
  const phoneContactPersonIdx = headers.findIndex((h: string) => h?.includes('電話担当'));
  const preferredContactTimeIdx = headers.findIndex((h: string) => h?.includes('連絡取りやすい'));
  const contactMethodIdx = headers.findIndex((h: string) => h?.includes('連絡方法'));

  console.log('  カラムインデックス:');
  console.log('    電話担当:', phoneContactPersonIdx, '-> ヘッダー:', headers[phoneContactPersonIdx]);
  console.log('    連絡取りやすい時間:', preferredContactTimeIdx, '-> ヘッダー:', headers[preferredContactTimeIdx]);
  console.log('    連絡方法:', contactMethodIdx, '-> ヘッダー:', headers[contactMethodIdx]);

  console.log('\n  スプレッドシートの値:');
  console.log('    電話担当:', aa130Row[phoneContactPersonIdx] || '(空)');
  console.log('    連絡取りやすい時間:', aa130Row[preferredContactTimeIdx] || '(空)');
  console.log('    連絡方法:', aa130Row[contactMethodIdx] || '(空)');

  // 3. 比較
  console.log('\n3. 比較結果:');
  const dbPhoneContact = seller?.phone_contact_person || '';
  const sheetPhoneContact = aa130Row[phoneContactPersonIdx] || '';
  const dbPreferredTime = seller?.preferred_contact_time || '';
  const sheetPreferredTime = aa130Row[preferredContactTimeIdx] || '';
  const dbContactMethod = seller?.contact_method || '';
  const sheetContactMethod = aa130Row[contactMethodIdx] || '';

  console.log('  電話担当: DB=', dbPhoneContact, ', Sheet=', sheetPhoneContact, dbPhoneContact === sheetPhoneContact ? '✅' : '❌ 不一致');
  console.log('  連絡取りやすい時間: DB=', dbPreferredTime, ', Sheet=', sheetPreferredTime, dbPreferredTime === sheetPreferredTime ? '✅' : '❌ 不一致');
  console.log('  連絡方法: DB=', dbContactMethod, ', Sheet=', sheetContactMethod, dbContactMethod === sheetContactMethod ? '✅' : '❌ 不一致');

  console.log('\n=== 調査完了 ===');
}

checkAA130Communication().catch(console.error);
