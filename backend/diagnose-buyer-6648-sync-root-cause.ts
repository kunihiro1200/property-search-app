// 買主6648の同期失敗の根本原因を診断
import { google } from 'googleapis';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnose() {
  console.log('=== 買主6648同期失敗の根本原因診断 ===\n');

  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // 1. ヘッダー取得
  console.log('1. ヘッダー取得中...');
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  console.log(`   ヘッダー数: ${headers.length}`);
  
  // 買主番号カラムのインデックスを確認
  const buyerNumberIndex = headers.indexOf('買主番号');
  console.log(`   "買主番号"カラムのインデックス: ${buyerNumberIndex}`);
  
  if (buyerNumberIndex === -1) {
    console.log('   ❌ エラー: "買主番号"カラムが見つかりません！');
    return;
  }

  // 2. 全データ取得
  console.log('\n2. 全データ取得中...');
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`   データ行数: ${rows.length}`);

  // 3. 買主6648を検索
  console.log('\n3. 買主6648を検索中...');
  let found6648 = false;
  let row6648Index = -1;
  let row6648Data: any[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (buyerNumber === '6648' || buyerNumber === 6648 || String(buyerNumber).trim() === '6648') {
      found6648 = true;
      row6648Index = i + 2; // +2 because row 1 is header and array is 0-indexed
      row6648Data = row;
      console.log(`   ✅ 買主6648が見つかりました！`);
      console.log(`   行番号: ${row6648Index}`);
      console.log(`   買主番号の値: "${buyerNumber}" (型: ${typeof buyerNumber})`);
      break;
    }
  }

  if (!found6648) {
    console.log('   ❌ 買主6648がスプレッドシートに見つかりません！');
    return;
  }

  // 4. マッピング処理をテスト
  console.log('\n4. マッピング処理をテスト...');
  const mapper = new BuyerColumnMapper();
  const mappedData = mapper.mapSpreadsheetToDatabase(headers, row6648Data);
  
  console.log(`   マッピング後のbuyer_number: "${mappedData.buyer_number}"`);
  console.log(`   buyer_numberの型: ${typeof mappedData.buyer_number}`);
  console.log(`   buyer_numberが空か: ${!mappedData.buyer_number || String(mappedData.buyer_number).trim() === ''}`);

  // 5. 同期処理のスキップ条件をチェック
  console.log('\n5. 同期処理のスキップ条件をチェック...');
  const wouldBeSkipped = !mappedData.buyer_number || String(mappedData.buyer_number).trim() === '';
  
  if (wouldBeSkipped) {
    console.log('   ❌ この買主はスキップされます！');
    console.log('   理由: buyer_numberが空または空白文字列');
  } else {
    console.log('   ✅ この買主はスキップされません');
  }

  // 6. 詳細なデータ分析
  console.log('\n6. 詳細なデータ分析...');
  console.log(`   行のカラム数: ${row6648Data.length}`);
  console.log(`   ヘッダーのカラム数: ${headers.length}`);
  
  if (row6648Data.length < headers.length) {
    console.log(`   ⚠️  警告: 行のカラム数がヘッダーより少ない（${headers.length - row6648Data.length}カラム不足）`);
  }

  // 買主番号周辺のデータを表示
  console.log('\n   買主番号周辺のデータ:');
  const startIndex = Math.max(0, buyerNumberIndex - 2);
  const endIndex = Math.min(headers.length, buyerNumberIndex + 3);
  
  for (let i = startIndex; i < endIndex; i++) {
    const value = row6648Data[i];
    const marker = i === buyerNumberIndex ? ' ← 買主番号' : '';
    console.log(`   [${i}] ${headers[i]}: "${value}" (型: ${typeof value})${marker}`);
  }

  // 7. マッピング後の全データを表示
  console.log('\n7. マッピング後の主要フィールド:');
  const keyFields = ['buyer_number', 'name', 'phone_number', 'email', 'reception_date'];
  keyFields.forEach(field => {
    console.log(`   ${field}: "${mappedData[field]}"`);
  });

  // 8. 結論
  console.log('\n=== 診断結果 ===');
  if (wouldBeSkipped) {
    console.log('❌ 問題: 買主6648はbuyer_numberが空のためスキップされています');
    console.log('\n考えられる原因:');
    console.log('1. スプレッドシートの"買主番号"カラムが空');
    console.log('2. カラムマッピングの設定ミス');
    console.log('3. 行のカラム数がヘッダーより少ない');
    console.log('4. データ型の変換エラー');
  } else {
    console.log('✅ buyer_numberは正常にマッピングされています');
    console.log('   別の理由で同期が失敗している可能性があります');
  }
}

diagnose().catch(console.error);
