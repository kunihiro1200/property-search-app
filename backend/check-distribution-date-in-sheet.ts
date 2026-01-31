/**
 * 物件リストスプレッドシートのAD列「配信日【公開）」を確認するスクリプト
 */

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });
dotenv.config({ path: path.join(__dirname, '.env') });

async function checkDistributionDateInSheet() {
  console.log('=== 物件リストスプレッドシートの配信日【公開）確認 ===\n');

  const spreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
  const sheetName = '物件';

  const client = new GoogleSheetsClient({
    spreadsheetId,
    sheetName,
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await client.authenticate();

  // ヘッダー行を取得
  const headers = await client.getHeaders();
  
  console.log('=== ヘッダー一覧（A列〜AH列） ===');
  for (let i = 0; i < Math.min(headers.length, 34); i++) {
    const letter = i < 26 ? String.fromCharCode(65 + i) : 'A' + String.fromCharCode(65 + i - 26);
    console.log(`${letter}列 (${i}): ${headers[i] || '(空)'}`);
  }

  // AD列のインデックスを探す
  const adIndex = headers.findIndex(h => h && h.includes('配信日'));
  console.log(`\n=== 配信日カラムの位置 ===`);
  if (adIndex >= 0) {
    const letter = adIndex < 26 ? String.fromCharCode(65 + adIndex) : 'A' + String.fromCharCode(65 + adIndex - 26);
    console.log(`「${headers[adIndex]}」が${letter}列（インデックス${adIndex}）にあります`);
  } else {
    console.log('配信日カラムが見つかりません');
  }

  // 最初の20行のデータを確認
  console.log('\n=== 配信日【公開）の最初の20行のデータ ===');
  const rows = await client.readAll();
  
  let hasDataCount = 0;
  let nullCount = 0;
  
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i];
    const propertyNumber = row['物件番号'] || '(不明)';
    const distributionDate = row['配信日【公開）'] || row['配信日（公開）'] || row['配信日'] || '(空)';
    console.log(`${i + 1}. ${propertyNumber}: 配信日=${distributionDate}`);
    
    if (distributionDate && distributionDate !== '(空)') {
      hasDataCount++;
    } else {
      nullCount++;
    }
  }

  // 全体の統計
  console.log('\n=== 全体の統計 ===');
  let totalHasData = 0;
  let totalNull = 0;
  
  for (const row of rows) {
    const distributionDate = row['配信日【公開）'] || row['配信日（公開）'] || row['配信日'];
    if (distributionDate && String(distributionDate).trim() !== '') {
      totalHasData++;
    } else {
      totalNull++;
    }
  }
  
  console.log(`総行数: ${rows.length}`);
  console.log(`配信日あり: ${totalHasData}件`);
  console.log(`配信日なし: ${totalNull}件`);

  // 配信日がある物件の例を表示
  console.log('\n=== 配信日がある物件の例（最初の10件） ===');
  let count = 0;
  for (const row of rows) {
    const distributionDate = row['配信日【公開）'] || row['配信日（公開）'] || row['配信日'];
    if (distributionDate && String(distributionDate).trim() !== '') {
      const propertyNumber = row['物件番号'] || '(不明)';
      console.log(`${propertyNumber}: ${distributionDate}`);
      count++;
      if (count >= 10) break;
    }
  }
}

checkDistributionDateInSheet().catch(console.error);
