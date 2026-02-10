// 買主6951のbroker_surveyをスプレッドシートから同期
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function syncBrokerSurvey() {
  console.log('買主6951のbroker_surveyをスプレッドシートから同期中...\n');

  // 列番号を列名に変換する関数（1 -> A, 27 -> AA, 182 -> FZ）
  function columnNumberToLetter(columnNumber: number): string {
    let columnName = '';
    while (columnNumber > 0) {
      const remainder = (columnNumber - 1) % 26;
      columnName = String.fromCharCode(65 + remainder) + columnName;
      columnNumber = Math.floor((columnNumber - 1) / 26);
    }
    return columnName;
  }

  // Google Sheetsクライアントを初期化
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });

  await sheetsClient.authenticate();
  console.log('✅ Google Sheets認証成功\n');

  // スプレッドシートからヘッダー行を取得（生データ）
  const headerRange = '1:1';
  const sheets = sheetsClient['sheets'];
  const spreadsheetId = sheetsClient['config'].spreadsheetId;
  const sheetName = sheetsClient['config'].sheetName;
  
  const headerResponse = await sheets!.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!${headerRange}`,
  });
  
  const headers = (headerResponse.data.values && headerResponse.data.values[0]) || [];
  console.log('ヘッダー行を取得しました');
  console.log('ヘッダー最初の10列:', headers.slice(0, 10));

  // FZ列のインデックスを探す（業者向けアンケート）
  const brokerSurveyIndex = headers.findIndex((h: string) => h === '業者向けアンケート');
  
  if (brokerSurveyIndex === -1) {
    console.error('❌ 業者向けアンケート列が見つかりません');
    console.log('利用可能なヘッダー:', headers.slice(0, 20).join(', '), '...');
    process.exit(1);
  }

  console.log(`✅ 業者向けアンケート列を発見: ${brokerSurveyIndex + 1}列目（${columnNumberToLetter(brokerSurveyIndex + 1)}列）\n`);

  // 買主番号列のインデックスを探す
  const buyerNumberIndex = headers.findIndex((h: string) => h === '買主番号');
  
  if (buyerNumberIndex === -1) {
    console.error('❌ 買主番号列が見つかりません');
    process.exit(1);
  }

  console.log(`✅ 買主番号列を発見: ${buyerNumberIndex + 1}列目\n`);

  // スプレッドシートから全データを取得（生データ）
  const endColumn = columnNumberToLetter(Math.max(brokerSurveyIndex, buyerNumberIndex) + 1);
  const dataRange = `A2:${endColumn}`;
  const dataResponse = await sheets!.spreadsheets.values.get({
    spreadsheetId: spreadsheetId,
    range: `${sheetName}!${dataRange}`,
  });
  
  const dataRows = dataResponse.data.values || [];
  console.log(`スプレッドシートから${dataRows.length}行を取得しました\n`);

  // 買主6951を探す
  const buyer6951Row = dataRows.find((row: any[]) => row[buyerNumberIndex] === '6951');

  if (!buyer6951Row) {
    console.error('❌ 買主6951が見つかりません');
    process.exit(1);
  }

  const brokerSurveyValue = buyer6951Row[brokerSurveyIndex] || null;
  console.log('買主6951のスプレッドシートデータ:');
  console.log('  買主番号:', buyer6951Row[buyerNumberIndex]);
  console.log('  業者向けアンケート:', brokerSurveyValue);
  console.log('');

  if (!brokerSurveyValue || brokerSurveyValue.trim() === '') {
    console.log('⚠️ 業者向けアンケートの値が空です');
    console.log('スプレッドシートに値を入力してから再度実行してください');
    process.exit(0);
  }

  // データベースを更新
  console.log('データベースを更新中...');
  const { data, error } = await supabase
    .from('buyers')
    .update({ broker_survey: brokerSurveyValue })
    .eq('buyer_number', '6951')
    .select();

  if (error) {
    console.error('❌ データベース更新に失敗しました:', error);
    process.exit(1);
  }

  console.log('✅ データベースを更新しました');
  console.log('更新後のデータ:', data);
}

syncBrokerSurvey()
  .then(() => {
    console.log('\n同期完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
