/**
 * AA376のスプレッドシートデータを確認
 */

import { google } from 'googleapis';
import * as path from 'path';

const SPREADSHEET_ID = '1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I';

async function checkAA376FromSheet() {
  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー行を取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!A1:CZ1',
  });
  const headers = headerResponse.data.values?.[0] || [];

  // データを取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: '売主リスト!B:CZ',
  });
  const rows = dataResponse.data.values || [];

  // AA376を探す（B列が売主番号、インデックス0）
  const aa376Row = rows.find(row => row[0] === 'AA376');
  if (!aa376Row) {
    console.log('AA376が見つかりません');
    return;
  }

  console.log('=== AA376のスプレッドシートデータ ===');
  console.log('売主番号:', aa376Row[0]);
  
  // 物件関連のフィールドを探す
  const fieldsToCheck = [
    '物件所在地',
    '種別',
    '土（㎡）',
    '建（㎡）',
    '築年',
    '構造',
    '間取り',
    'サイト',
    '状況（当社）',
    '次電日',
    '営担',
    '査定額',
  ];

  console.log('\n=== 物件関連フィールド ===');
  headers.forEach((header, index) => {
    if (fieldsToCheck.some(f => header && header.includes(f))) {
      // B列起点なので、インデックスを調整（A列が0、B列が1なので、B列起点では-1）
      const dataIndex = index - 1;
      const value = dataIndex >= 0 ? aa376Row[dataIndex] : '(範囲外)';
      console.log(`${header} (列${index}): ${value || '(空)'}`);
    }
  });

  // R列（物件所在地）を直接確認
  console.log('\n=== R列（物件所在地）の確認 ===');
  // R列はA列から数えて18番目（0-indexed: 17）
  // B列起点では17-1=16
  console.log('R列ヘッダー:', headers[17]);
  console.log('R列の値:', aa376Row[16] || '(空)');
}

checkAA376FromSheet().catch(console.error);
