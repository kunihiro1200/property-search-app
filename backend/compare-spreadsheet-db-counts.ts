import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function compareSpreadsheetAndDB() {
  console.log('📊 スプレッドシートとデータベースの件数比較\n');

  try {
    // Google Sheets認証
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    // スプレッドシートからデータ取得（全列取得してヘッダーから売主番号列を特定）
    console.log('🔍 スプレッドシートからデータ取得中...');
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}`, // 全列取得
    });

    const sheetRows = response.data.values || [];
    
    if (sheetRows.length === 0) {
      console.error('❌ スプレッドシートにデータがありません');
      return;
    }

    // ヘッダー行から売主番号列のインデックスを特定
    const headers = sheetRows[0];
    const sellerNumberColumnIndex = headers.findIndex(
      (header: string) => header && header.includes('売主番号')
    );

    if (sellerNumberColumnIndex === -1) {
      console.error('❌ 売主番号列が見つかりません。ヘッダー:', headers);
      return;
    }

    console.log(`✅ 売主番号列: ${String.fromCharCode(65 + sellerNumberColumnIndex)}列 (インデックス: ${sellerNumberColumnIndex})`);
    console.log(`✅ スプレッドシート総行数: ${sheetRows.length}`);
    console.log(`✅ スプレッドシート売主数（ヘッダー除く）: ${sheetRows.length - 1}\n`);

    // スプレッドシートの売主番号リストを取得（ヘッダー除く）
    const sheetSellerNumbers = sheetRows
      .slice(1) // ヘッダー除く
      .map(row => row[sellerNumberColumnIndex])
      .filter(num => num && num.toString().trim()); // 空行除く

    console.log(`✅ 有効な売主番号数（スプレッドシート）: ${sheetSellerNumbers.length}\n`);

    // データベースから売主数取得
    console.log('🔍 データベースから売主数取得中...');
    const { count: dbCount, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ データベースエラー:', countError);
      return;
    }

    console.log(`✅ データベース売主数: ${dbCount}\n`);

    // データベースの売主番号リストを取得（全件取得）
    console.log('🔍 データベースから全売主番号取得中...');
    let allDbSellers: any[] = [];
    let page = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data: dbSellers, error: dbError } = await supabase
        .from('sellers')
        .select('seller_number')
        .order('seller_number')
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (dbError) {
        console.error('❌ データベースエラー:', dbError);
        return;
      }

      if (!dbSellers || dbSellers.length === 0) {
        break;
      }

      allDbSellers = allDbSellers.concat(dbSellers);
      console.log(`  取得済み: ${allDbSellers.length} 件...`);
      
      if (dbSellers.length < pageSize) {
        break;
      }
      
      page++;
    }

    const dbSellerNumbers = allDbSellers.map(s => s.seller_number);

    // 比較結果
    console.log('📊 比較結果:');
    console.log('='.repeat(60));
    console.log(`スプレッドシート: ${sheetSellerNumbers.length} 件`);
    console.log(`データベース:     ${dbSellerNumbers.length} 件`);
    console.log(`差分:             ${sheetSellerNumbers.length - dbSellerNumbers.length} 件`);
    console.log('='.repeat(60));
    console.log('');

    // スプレッドシートにあってDBにない売主番号を検出
    const missingInDB = sheetSellerNumbers.filter(
      num => !dbSellerNumbers.includes(num)
    );

    if (missingInDB.length > 0) {
      console.log(`⚠️ スプレッドシートにあってDBにない売主: ${missingInDB.length} 件`);
      console.log('最初の10件:');
      missingInDB.slice(0, 10).forEach(num => {
        console.log(`  - ${num}`);
      });
      if (missingInDB.length > 10) {
        console.log(`  ... 他 ${missingInDB.length - 10} 件`);
      }
      console.log('');
    }

    // DBにあってスプレッドシートにない売主番号を検出
    const missingInSheet = dbSellerNumbers.filter(
      num => !sheetSellerNumbers.includes(num)
    );

    if (missingInSheet.length > 0) {
      console.log(`⚠️ DBにあってスプレッドシートにない売主: ${missingInSheet.length} 件`);
      console.log('最初の10件:');
      missingInSheet.slice(0, 10).forEach(num => {
        console.log(`  - ${num}`);
      });
      if (missingInSheet.length > 10) {
        console.log(`  ... 他 ${missingInSheet.length - 10} 件`);
      }
      console.log('');
    }

    // 重複チェック
    const sheetDuplicates = sheetSellerNumbers.filter(
      (num, index) => sheetSellerNumbers.indexOf(num) !== index
    );

    if (sheetDuplicates.length > 0) {
      console.log(`⚠️ スプレッドシートに重複がある売主番号: ${sheetDuplicates.length} 件`);
      const uniqueDuplicates = [...new Set(sheetDuplicates)];
      uniqueDuplicates.slice(0, 10).forEach(num => {
        const count = sheetSellerNumbers.filter(n => n === num).length;
        console.log(`  - ${num} (${count}回)`);
      });
      console.log('');
    }

    // サマリー
    console.log('📝 サマリー:');
    if (missingInDB.length === 0 && missingInSheet.length === 0) {
      console.log('✅ スプレッドシートとデータベースは完全に同期されています');
    } else {
      console.log('⚠️ 同期の不整合が検出されました:');
      if (missingInDB.length > 0) {
        console.log(`  - スプレッドシートからDBへの同期が必要: ${missingInDB.length} 件`);
      }
      if (missingInSheet.length > 0) {
        console.log(`  - DBからスプレッドシートへの同期が必要: ${missingInSheet.length} 件`);
      }
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

compareSpreadsheetAndDB().then(() => {
  console.log('\n✅ 比較完了');
  process.exit(0);
}).catch(err => {
  console.error('❌ エラー:', err);
  process.exit(1);
});
