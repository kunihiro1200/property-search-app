import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config({ path: './backend/.env' });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * ユーザーに確認プロンプトを表示
 */
function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function syncDeletedBuyers() {
  console.log('=== スプレッドシートから削除された買主をデータベースから削除 ===\n');

  // コマンドライン引数を確認
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 ドライランモード: 削除は実行されません\n');
  }

  // スプレッドシートから買主番号を取得
  console.log('ステップ1: スプレッドシートから買主番号を取得中...\n');
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  });

  await sheetsClient.authenticate();

  const sheetName = process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト';
  const range = `${sheetName}!E5:E`; // E列：買主番号、5行目から開始

  const response = await sheetsClient.sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    range: range,
  });

  const rows = response.data.values || [];
  const sheetBuyerNumbers = new Set<string>();

  // スプレッドシートの買主番号を収集
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || row[0].trim() === '') {
      continue;
    }
    const value = row[0].trim();
    sheetBuyerNumbers.add(value);
  }

  console.log(`スプレッドシートの買主数: ${sheetBuyerNumbers.size}件\n`);

  // データベースから全買主を取得
  console.log('ステップ2: データベースから全買主を取得中...\n');
  
  const { data: dbBuyers, error: dbError } = await supabase
    .from('buyers')
    .select('buyer_number, name, phone_number, property_number, reception_date')
    .order('buyer_number', { ascending: true });

  if (dbError) {
    console.error('データベースエラー:', dbError);
    return;
  }

  console.log(`データベースの買主数: ${dbBuyers?.length || 0}件\n`);

  // スプレッドシートに存在しない買主を検出
  console.log('ステップ3: スプレッドシートに存在しない買主を検出中...\n');
  
  const buyersToDelete: any[] = [];

  if (dbBuyers) {
    for (const buyer of dbBuyers) {
      if (!sheetBuyerNumbers.has(buyer.buyer_number)) {
        buyersToDelete.push(buyer);
      }
    }
  }

  if (buyersToDelete.length === 0) {
    console.log('✅ スプレッドシートに存在しない買主はありません\n');
    return;
  }

  console.log(`❌ スプレッドシートに存在しない買主: ${buyersToDelete.length}件\n`);
  
  // 削除対象が多い場合は警告
  if (buyersToDelete.length > 100) {
    console.log('⚠️  警告: 削除対象が100件を超えています。慎重に確認してください。\n');
  }
  
  console.log('削除対象の買主一覧:\n');

  buyersToDelete.forEach((buyer, index) => {
    console.log(`${index + 1}. 買主番号: ${buyer.buyer_number}`);
    console.log(`   氏名: ${buyer.name || '(空欄)'}`);
    console.log(`   電話番号: ${buyer.phone_number || '(空欄)'}`);
    console.log(`   物件番号: ${buyer.property_number || '(空欄)'}`);
    console.log(`   受付日: ${buyer.reception_date || '(空欄)'}`);
    console.log('');
  });

  // ドライランモードの場合はここで終了
  if (dryRun) {
    console.log('🔍 ドライランモード: 削除は実行されませんでした\n');
    console.log('削除を実行する場合は、--dry-runオプションを外して再実行してください。');
    return;
  }

  // 確認プロンプトを表示
  console.log(`\n⚠️  ${buyersToDelete.length}件の買主をデータベースから削除します。`);
  const confirmed = await askConfirmation('本当に削除しますか？ (yes/no): ');

  if (!confirmed) {
    console.log('\n❌ 削除をキャンセルしました');
    return;
  }

  // 削除実行
  console.log('\nステップ4: データベースから削除中...\n');

  let successCount = 0;
  let failCount = 0;

  for (const buyer of buyersToDelete) {
    const { error } = await supabase
      .from('buyers')
      .delete()
      .eq('buyer_number', buyer.buyer_number);

    if (error) {
      console.error(`❌ 買主番号 ${buyer.buyer_number} の削除に失敗: ${error.message}`);
      failCount++;
    } else {
      console.log(`✅ 買主番号 ${buyer.buyer_number} を削除しました`);
      successCount++;
    }
  }

  console.log('\n=== 削除完了 ===');
  console.log(`成功: ${successCount}件`);
  console.log(`失敗: ${failCount}件`);
  
  if (failCount > 0) {
    console.log('\n⚠️  一部の買主の削除に失敗しました。エラーメッセージを確認してください。');
  }
}

syncDeletedBuyers().catch(console.error);
