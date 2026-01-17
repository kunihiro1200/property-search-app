import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnose() {
  console.log('=== 買主6648 根本原因診断 ===\n');

  // 1. スプレッドシートから6648を検索
  console.log('1. スプレッドシートから買主6648を検索中...');
  
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });

  // ヘッダー取得
  const headerResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!1:1`,
  });
  const headers = headerResponse.data.values?.[0] || [];
  console.log(`   ヘッダー数: ${headers.length}`);

  // 買主番号のカラムインデックスを見つける
  const buyerNumberIndex = headers.findIndex(h => 
    h === '買主番号' || h.includes('買主番号')
  );
  
  if (buyerNumberIndex === -1) {
    console.error('   ❌ 買主番号カラムが見つかりません');
    return;
  }
  
  console.log(`   買主番号カラム: ${buyerNumberIndex + 1} (${headers[buyerNumberIndex]})`);

  // 全データ取得
  const dataResponse = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:GZ`,
  });
  const rows = dataResponse.data.values || [];
  console.log(`   総行数: ${rows.length}\n`);

  // 6648を検索
  let found6648 = false;
  let row6648: any[] | null = null;
  let rowNumber6648 = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (buyerNumber === '6648' || buyerNumber === 6648 || String(buyerNumber).trim() === '6648') {
      found6648 = true;
      row6648 = row;
      rowNumber6648 = i + 2; // +2 because row 1 is header and array is 0-indexed
      break;
    }
  }

  if (!found6648 || !row6648) {
    console.error('2. ❌ スプレッドシートに買主6648が見つかりません');
    return;
  }

  console.log(`2. ✅ スプレッドシートで買主6648を発見 (行番号: ${rowNumber6648})`);
  console.log(`   買主番号: ${row6648[buyerNumberIndex]}`);
  
  // 重要なフィールドを表示
  const nameIndex = headers.findIndex(h => h.includes('氏名') || h.includes('会社名'));
  const phoneIndex = headers.findIndex(h => h.includes('電話番号'));
  const emailIndex = headers.findIndex(h => h.includes('メールアドレス'));
  
  if (nameIndex !== -1) {
    console.log(`   氏名: ${row6648[nameIndex] || '(空)'}`);
  }
  if (phoneIndex !== -1) {
    console.log(`   電話番号: ${row6648[phoneIndex] || '(空)'}`);
  }
  if (emailIndex !== -1) {
    console.log(`   メールアドレス: ${row6648[emailIndex] || '(空)'}`);
  }

  // 3. データベースで6648を検索
  console.log('\n3. データベースで買主6648を検索中...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const { data: dbBuyer, error: dbError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648')
    .single();

  if (dbError) {
    if (dbError.code === 'PGRST116') {
      console.log('   ❌ データベースに買主6648が存在しません');
    } else {
      console.error(`   ❌ データベースエラー: ${dbError.message}`);
    }
  } else {
    console.log('   ✅ データベースに買主6648が存在します');
    console.log(`   ID: ${dbBuyer.id}`);
    console.log(`   氏名: ${dbBuyer.name || '(空)'}`);
    console.log(`   最終同期: ${dbBuyer.last_synced_at || '(未同期)'}`);
  }

  // 4. 同期ログを確認
  console.log('\n4. 同期ログを確認中...');
  
  const { data: syncLogs, error: logError } = await supabase
    .from('buyer_sync_logs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  if (logError) {
    console.error(`   ❌ ログ取得エラー: ${logError.message}`);
  } else if (!syncLogs || syncLogs.length === 0) {
    console.log('   ⚠️  同期ログが見つかりません');
  } else {
    console.log(`   最新の同期ログ (${syncLogs.length}件):`);
    syncLogs.forEach((log, index) => {
      console.log(`   ${index + 1}. ${log.started_at}`);
      console.log(`      状態: ${log.status}`);
      console.log(`      作成: ${log.created_count}, 更新: ${log.updated_count}, 失敗: ${log.failed_count}`);
      if (log.error_details) {
        console.log(`      エラー詳細: ${JSON.stringify(log.error_details).substring(0, 100)}...`);
      }
    });
  }

  // 5. 6647と6648の比較
  console.log('\n5. 買主6647と6648の比較...');
  
  const { data: buyer6647, error: error6647 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647')
    .single();

  if (error6647) {
    console.log('   ⚠️  買主6647もデータベースに存在しません');
  } else {
    console.log('   ✅ 買主6647はデータベースに存在します');
    console.log(`   6647 氏名: ${buyer6647.name}`);
    console.log(`   6647 電話: ${buyer6647.phone}`);
    console.log(`   6647 メール: ${buyer6647.email}`);
    
    if (dbBuyer) {
      console.log(`   6648 氏名: ${dbBuyer.name}`);
      console.log(`   6648 電話: ${dbBuyer.phone}`);
      console.log(`   6648 メール: ${dbBuyer.email}`);
      
      // 同一人物かチェック
      if (buyer6647.phone === dbBuyer.phone) {
        console.log('   ✅ 電話番号が一致 → 同一人物');
      }
    }
  }

  // 6. スプレッドシートの6647も確認
  console.log('\n6. スプレッドシートで買主6647を確認...');
  
  let found6647 = false;
  let row6647: any[] | null = null;
  let rowNumber6647 = -1;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const buyerNumber = row[buyerNumberIndex];
    
    if (buyerNumber === '6647' || buyerNumber === 6647 || String(buyerNumber).trim() === '6647') {
      found6647 = true;
      row6647 = row;
      rowNumber6647 = i + 2;
      break;
    }
  }

  if (found6647 && row6647) {
    console.log(`   ✅ スプレッドシートで買主6647を発見 (行番号: ${rowNumber6647})`);
    if (phoneIndex !== -1) {
      const phone6647 = row6647[phoneIndex];
      const phone6648 = row6648[phoneIndex];
      console.log(`   6647 電話: ${phone6647}`);
      console.log(`   6648 電話: ${phone6648}`);
      
      if (phone6647 === phone6648) {
        console.log('   ✅ 電話番号が一致 → 同一人物（異なる物件への問い合わせ）');
      }
    }
  }

  // 7. 結論
  console.log('\n=== 診断結果 ===');
  console.log(`スプレッドシートに6648: ${found6648 ? '✅ 存在' : '❌ 不在'}`);
  console.log(`データベースに6648: ${dbBuyer ? '✅ 存在' : '❌ 不在'}`);
  console.log(`スプレッドシートに6647: ${found6647 ? '✅ 存在' : '❌ 不在'}`);
  console.log(`データベースに6647: ${buyer6647 ? '✅ 存在' : '❌ 不在'}`);
  
  if (found6648 && !dbBuyer) {
    console.log('\n⚠️  問題: 買主6648はスプレッドシートに存在するが、データベースに同期されていません');
    console.log('次のステップ:');
    console.log('1. 同期処理を実行して、エラーログを確認');
    console.log('2. 6648の行データに問題がないか確認');
    console.log('3. データベースの制約違反がないか確認');
  }
}

diagnose().catch(console.error);
