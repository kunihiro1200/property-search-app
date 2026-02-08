/**
 * 買主番号6927の同期状況を調査
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function debugBuyer6927() {
  console.log('=== 買主番号6927の同期状況を調査 ===\n');

  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // Google Sheets認証
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  try {
    // 1. データベースで6927を検索
    console.log('1. データベースで買主番号6927を検索...\n');
    const { data: dbBuyer, error: dbError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6927')
      .single();

    if (dbError) {
      console.log('❌ データベースエラー:', dbError.message);
      console.log('   買主番号6927はデータベースに存在しません\n');
    } else if (dbBuyer) {
      console.log('✅ データベースに存在します');
      console.log('   buyer_number:', dbBuyer.buyer_number);
      console.log('   name:', dbBuyer.name);
      console.log('   phone_number:', dbBuyer.phone_number);
      console.log('   email:', dbBuyer.email);
      console.log('   reception_date:', dbBuyer.reception_date);
      console.log('   latest_viewing_date:', dbBuyer.latest_viewing_date);
      console.log('   follow_up_assignee:', dbBuyer.follow_up_assignee);
      console.log('   latest_status:', dbBuyer.latest_status);
      console.log('   created_at:', dbBuyer.created_at);
      console.log('   updated_at:', dbBuyer.updated_at);
      console.log('   deleted_at:', dbBuyer.deleted_at);
      console.log('');
    }

    // 2. スプレッドシートで6927を検索
    console.log('2. スプレッドシートで買主番号6927を検索...\n');
    
    // ヘッダー取得
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`   ヘッダー数: ${headers.length}`);
    
    // 買主番号のカラムインデックスを取得
    const buyerNumberIndex = headers.indexOf('買主番号');
    if (buyerNumberIndex === -1) {
      console.log('❌ 「買主番号」カラムが見つかりません');
      return;
    }
    console.log(`   「買主番号」カラムのインデックス: ${buyerNumberIndex} (${String.fromCharCode(65 + buyerNumberIndex)}列)\n`);

    // 全データ取得
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    console.log(`   データ行数: ${rows.length}\n`);

    // 6927を検索
    let found = false;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const buyerNumber = row[buyerNumberIndex]?.toString().trim();
      
      if (buyerNumber === '6927') {
        found = true;
        const rowNumber = i + 2; // ヘッダー行を考慮
        console.log(`✅ スプレッドシートに存在します（行番号: ${rowNumber}）\n`);
        
        // 主要フィールドを表示
        console.log('   主要フィールド:');
        const nameIndex = headers.indexOf('●氏名・会社名');
        const phoneIndex = headers.indexOf('●電話番号\n（ハイフン不要）');
        const emailIndex = headers.indexOf('●メアド');
        const receptionDateIndex = headers.indexOf('受付日');
        const viewingDateIndex = headers.indexOf('●内覧日(最新）');
        const assigneeIndex = headers.indexOf('後続担当');
        const statusIndex = headers.indexOf('★最新状況');
        
        if (nameIndex !== -1) console.log(`   - 氏名: ${row[nameIndex] || '(空欄)'}`);
        if (phoneIndex !== -1) console.log(`   - 電話番号: ${row[phoneIndex] || '(空欄)'}`);
        if (emailIndex !== -1) console.log(`   - メアド: ${row[emailIndex] || '(空欄)'}`);
        if (receptionDateIndex !== -1) console.log(`   - 受付日: ${row[receptionDateIndex] || '(空欄)'}`);
        if (viewingDateIndex !== -1) console.log(`   - 内覧日: ${row[viewingDateIndex] || '(空欄)'}`);
        if (assigneeIndex !== -1) console.log(`   - 後続担当: ${row[assigneeIndex] || '(空欄)'}`);
        if (statusIndex !== -1) console.log(`   - 最新状況: ${row[statusIndex] || '(空欄)'}`);
        console.log('');
        
        // 全フィールドを表示（デバッグ用）
        console.log('   全フィールド:');
        for (let j = 0; j < Math.min(headers.length, row.length); j++) {
          if (row[j]) {
            console.log(`   - ${headers[j]}: ${row[j]}`);
          }
        }
        
        break;
      }
    }

    if (!found) {
      console.log('❌ スプレッドシートに存在しません\n');
    }

    // 3. 結論
    console.log('\n=== 調査結果 ===\n');
    
    if (!found) {
      console.log('❌ 買主番号6927はスプレッドシートに存在しません');
      console.log('   → スプレッドシートに追加してください\n');
    } else if (dbError) {
      console.log('⚠️ 買主番号6927はスプレッドシートに存在しますが、データベースに同期されていません');
      console.log('   → 同期を実行してください:');
      console.log('      cd backend');
      console.log('      npx ts-node sync-buyers.ts\n');
    } else {
      console.log('✅ 買主番号6927はスプレッドシートとデータベースの両方に存在します');
      if (dbBuyer.deleted_at) {
        console.log('   ⚠️ ただし、deleted_atが設定されています（削除済み）');
        console.log(`      deleted_at: ${dbBuyer.deleted_at}\n`);
      } else {
        console.log('   正常に同期されています\n');
      }
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

debugBuyer6927()
  .then(() => {
    console.log('調査完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
