/**
 * AA130の同期処理をデバッグ
 */

import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function debugAA130Sync() {
  console.log('=== AA130 同期デバッグ ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  // ヘッダー行を取得（1行目全体）
  console.log('1. ヘッダー行を取得...');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!1:1",
  });
  const headers = headerResponse.data.values?.[0] || [];
  console.log('  ヘッダー数:', headers.length);

  // 「電話担当（任意）」のインデックスを探す
  const phoneContactIdx = headers.findIndex((h: string) => h === '電話担当（任意）');
  console.log('  「電話担当（任意）」のインデックス:', phoneContactIdx);
  if (phoneContactIdx >= 0) {
    console.log('  ヘッダー名:', headers[phoneContactIdx]);
  }

  // AA130の行を取得
  console.log('\n2. AA130の行を取得...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: "'売主リスト'!A2:ZZZ",
  });
  const rows = dataResponse.data.values || [];
  console.log('  総行数:', rows.length);

  // AA130を探す（B列で検索 - インデックス1）
  const aa130RowIndex = rows.findIndex(row => row[1] === 'AA130');
  if (aa130RowIndex === -1) {
    console.log('  AA130が見つかりません');
    return;
  }

  const aa130Row = rows[aa130RowIndex];
  console.log('  AA130の行インデックス:', aa130RowIndex);
  console.log('  AA130の行の長さ:', aa130Row.length);

  // 電話担当の値を確認
  console.log('\n3. 電話担当の値を確認...');
  console.log('  phoneContactIdx:', phoneContactIdx);
  console.log('  aa130Row[phoneContactIdx]:', aa130Row[phoneContactIdx]);
  console.log('  aa130Row[phoneContactIdx] の型:', typeof aa130Row[phoneContactIdx]);

  // rowToObjectの動作をシミュレート
  console.log('\n4. rowToObjectのシミュレーション...');
  const obj: any = {};
  headers.forEach((header: string, index: number) => {
    const value = aa130Row[index];
    obj[header] = value !== undefined && value !== '' ? value : null;
  });

  console.log('  obj["電話担当（任意）"]:', obj['電話担当（任意）']);
  console.log('  obj["連絡取りやすい日、時間帯"]:', obj['連絡取りやすい日、時間帯']);
  console.log('  obj["連絡方法"]:', obj['連絡方法']);

  // 同期処理の条件をチェック
  console.log('\n5. 同期処理の条件チェック...');
  const phoneContactPerson = obj['電話担当（任意）'];
  console.log('  phoneContactPerson:', phoneContactPerson);
  console.log('  if (phoneContactPerson) の結果:', !!phoneContactPerson);

  console.log('\n=== デバッグ完了 ===');
}

debugAA130Sync().catch(console.error);
