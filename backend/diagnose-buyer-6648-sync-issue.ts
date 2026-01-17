import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Google Sheets設定
const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const BUYER_SHEET_NAME = '買主リスト';

async function getGoogleSheetsClient() {
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const authClient = await auth.getClient();
  return google.sheets({ version: 'v4', auth: authClient as any });
}

async function diagnoseBuyer6648Issue() {
  console.log('=== 買主6648同期問題の診断 ===\n');

  const sheets = await getGoogleSheetsClient();

  // 1. スプレッドシートから6647と6648を取得
  console.log('1. スプレッドシートから買主6647と6648を検索...\n');
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${BUYER_SHEET_NAME}!A:Z`,
  });

  const rows = response.data.values || [];
  const headers = rows[0];
  
  console.log('スプレッドシートのヘッダー:');
  headers.forEach((header, index) => {
    console.log(`  ${index}: ${header}`);
  });
  console.log('\n');

  // 買主番号のカラムインデックスを見つける
  const buyerNumberIndex = headers.findIndex((h: string) => 
    h === '買主番号' || h === 'buyer_number'
  );

  if (buyerNumberIndex === -1) {
    console.error('買主番号カラムが見つかりません');
    return;
  }

  console.log(`買主番号カラムのインデックス: ${buyerNumberIndex}\n`);

  // 6647と6648を検索
  const buyer6647Rows = rows.filter((row, index) => 
    index > 0 && row[buyerNumberIndex] === '6647'
  );
  const buyer6648Rows = rows.filter((row, index) => 
    index > 0 && row[buyerNumberIndex] === '6648'
  );

  console.log('=== スプレッドシートの買主6647 ===');
  console.log(`件数: ${buyer6647Rows.length}`);
  buyer6647Rows.forEach((row, index) => {
    console.log(`\n${index + 1}件目:`);
    headers.forEach((header, colIndex) => {
      if (row[colIndex]) {
        console.log(`  ${header}: ${row[colIndex]}`);
      }
    });
  });

  console.log('\n=== スプレッドシートの買主6648 ===');
  console.log(`件数: ${buyer6648Rows.length}`);
  buyer6648Rows.forEach((row, index) => {
    console.log(`\n${index + 1}件目:`);
    headers.forEach((header, colIndex) => {
      if (row[colIndex]) {
        console.log(`  ${header}: ${row[colIndex]}`);
      }
    });
  });

  // 2. データベースから6647と6648を取得
  console.log('\n\n=== データベースの買主6647 ===');
  const { data: db6647, error: error6647 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647');

  if (error6647) {
    console.error('エラー:', error6647);
  } else {
    console.log(`件数: ${db6647?.length || 0}`);
    db6647?.forEach((buyer, index) => {
      console.log(`\n${index + 1}件目:`);
      Object.entries(buyer).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          console.log(`  ${key}: ${value}`);
        }
      });
    });
  }

  console.log('\n\n=== データベースの買主6648 ===');
  const { data: db6648, error: error6648 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648');

  if (error6648) {
    console.error('エラー:', error6648);
  } else {
    console.log(`件数: ${db6648?.length || 0}`);
    db6648?.forEach((buyer, index) => {
      console.log(`\n${index + 1}件目:`);
      Object.entries(buyer).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          console.log(`  ${key}: ${value}`);
        }
      });
    });
  }

  // 3. 比較分析
  console.log('\n\n=== 比較分析 ===');
  
  if (buyer6647Rows.length > 0 && db6647 && db6647.length > 0) {
    console.log('✓ 買主6647: スプレッドシートとDBの両方に存在');
  } else if (buyer6647Rows.length > 0) {
    console.log('⚠ 買主6647: スプレッドシートにのみ存在（DBに未同期）');
  } else if (db6647 && db6647.length > 0) {
    console.log('⚠ 買主6647: DBにのみ存在（スプレッドシートから削除済み？）');
  }

  if (buyer6648Rows.length > 0 && db6648 && db6648.length > 0) {
    console.log('✓ 買主6648: スプレッドシートとDBの両方に存在');
  } else if (buyer6648Rows.length > 0) {
    console.log('✗ 買主6648: スプレッドシートにのみ存在（DBに未同期）← これが問題');
  } else if (db6648 && db6648.length > 0) {
    console.log('⚠ 買主6648: DBにのみ存在（スプレッドシートから削除済み？）');
  }

  // 4. 同じ電話番号・メールアドレスの買主を検索
  if (buyer6648Rows.length > 0) {
    const row6648 = buyer6648Rows[0];
    const phoneIndex = headers.findIndex((h: string) => h.includes('電話') || h.includes('phone'));
    const emailIndex = headers.findIndex((h: string) => h.includes('メール') || h.includes('email'));
    
    if (phoneIndex !== -1 && row6648[phoneIndex]) {
      const phone = row6648[phoneIndex];
      console.log(`\n買主6648の電話番号: ${phone}`);
      
      const { data: samePhone } = await supabase
        .from('buyers')
        .select('buyer_number, name, phone_number, property_number')
        .eq('phone_number', phone)
        .order('buyer_number');
      
      if (samePhone && samePhone.length > 0) {
        console.log(`同じ電話番号を持つ買主（DB内）: ${samePhone.length}件`);
        samePhone.forEach(b => {
          console.log(`  - 買主${b.buyer_number}: ${b.name} (物件: ${b.property_number})`);
        });
      }
    }

    if (emailIndex !== -1 && row6648[emailIndex]) {
      const email = row6648[emailIndex];
      console.log(`\n買主6648のメールアドレス: ${email}`);
      
      const { data: sameEmail } = await supabase
        .from('buyers')
        .select('buyer_number, name, email, property_number')
        .eq('email', email)
        .order('buyer_number');
      
      if (sameEmail && sameEmail.length > 0) {
        console.log(`同じメールアドレスを持つ買主（DB内）: ${sameEmail.length}件`);
        sameEmail.forEach(b => {
          console.log(`  - 買主${b.buyer_number}: ${b.name} (物件: ${b.property_number})`);
        });
      }
    }
  }

  // 5. 同期ログを確認
  console.log('\n\n=== 同期ログの確認 ===');
  const { data: syncLogs, error: logError } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('entity_type', 'buyer')
    .or('entity_id.eq.6648,details.ilike.%6648%')
    .order('created_at', { ascending: false })
    .limit(10);

  if (logError) {
    console.error('同期ログ取得エラー:', logError);
  } else if (syncLogs && syncLogs.length > 0) {
    console.log(`買主6648関連の同期ログ: ${syncLogs.length}件`);
    syncLogs.forEach((log, index) => {
      console.log(`\n${index + 1}. ${log.created_at}`);
      console.log(`   操作: ${log.operation}`);
      console.log(`   ステータス: ${log.status}`);
      if (log.error_message) {
        console.log(`   エラー: ${log.error_message}`);
      }
      if (log.details) {
        console.log(`   詳細: ${JSON.stringify(log.details, null, 2)}`);
      }
    });
  } else {
    console.log('買主6648関連の同期ログが見つかりません');
  }
}

diagnoseBuyer6648Issue().catch(console.error);
