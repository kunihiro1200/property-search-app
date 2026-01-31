/**
 * 物件リストスプレッドシートのAD列（公開日）を確認するスクリプト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkADColumn() {
  console.log('=== 物件リストスプレッドシートのAD列確認 ===\n');

  const spreadsheetId = process.env.PROPERTY_LISTING_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
  const sheetName = '物件リスト';

  const client = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await client.authenticate();

  // ヘッダー行を取得
  const headers = await client.getHeaders();
  
  console.log('=== ヘッダー一覧（A列〜AH列） ===');
  const columnLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZAAABACADAEAFAGAH'.match(/.{1,2}/g) || [];
  
  // A-Z, AA-AH まで表示
  for (let i = 0; i < Math.min(headers.length, 34); i++) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
    console.log(`${letter}列 (${i}): ${headers[i] || '(空)'}`);
  }

  // AD列は29番目（0-indexed）
  const adColumnIndex = 29; // A=0, B=1, ..., Z=25, AA=26, AB=27, AC=28, AD=29
  console.log(`\n=== AD列（インデックス${adColumnIndex}）の詳細 ===`);
  console.log(`AD列のヘッダー: "${headers[adColumnIndex] || '(空)'}"`);

  // 最初の10行のAD列データを確認
  console.log('\n=== AD列の最初の10行のデータ ===');
  const rows = await client.readAll();
  
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = rows[i];
    const propertyNumber = row['物件番号'] || row[1] || '(不明)';
    const adValue = Object.values(row)[adColumnIndex] || '(空)';
    console.log(`${i + 1}. ${propertyNumber}: AD列=${adValue}`);
  }

  // distribution_dateカラムにマッピングされているか確認
  console.log('\n=== distribution_dateへのマッピング確認 ===');
  const distributionDateHeader = headers.find(h => 
    h && (h.includes('配信') || h.includes('公開') || h.includes('distribution'))
  );
  
  if (distributionDateHeader) {
    const index = headers.indexOf(distributionDateHeader);
    const letter = index < 26 ? String.fromCharCode(65 + index) : 'A' + String.fromCharCode(65 + index - 26);
    console.log(`「${distributionDateHeader}」が${letter}列（インデックス${index}）にあります`);
  } else {
    console.log('配信日/公開日に関連するヘッダーが見つかりません');
  }
}

checkADColumn().catch(console.error);
