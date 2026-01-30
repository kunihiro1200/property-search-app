import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13496CurrentState() {
  console.log('🔍 Checking AA13496 current state...\n');

  // 1. データベースの現在の状態を確認
  console.log('📊 Database (current state):');
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA13496')
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
  } else if (dbSeller) {
    console.log('  売主番号:', dbSeller.seller_number);
    console.log('  名前:', dbSeller.name);
    console.log('  電話番号:', dbSeller.phone_number);
    console.log('  メール:', dbSeller.email);
    console.log('  住所:', dbSeller.address);
    console.log('  物件所在地:', dbSeller.property_address);
    console.log('  状況:', dbSeller.status);
    console.log('  コメント:', dbSeller.comments);
    console.log('  不通:', dbSeller.unreachable_status);
    console.log('  査定方法:', dbSeller.valuation_method);
    console.log('  更新日時:', dbSeller.updated_at);
  } else {
    console.log('  ❌ Not found in database');
  }

  // 2. スプレッドシートの現在の状態を確認
  console.log('\n📊 Spreadsheet (current state):');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await sheetsClient.authenticate();
  const allRows = await sheetsClient.readAll();
  
  const sheetRow = allRows.find(row => row['売主番号'] === 'AA13496');
  
  if (sheetRow) {
    console.log('  売主番号:', sheetRow['売主番号']);
    console.log('  名前:', sheetRow['名前(漢字のみ）']);
    console.log('  電話番号:', sheetRow['電話番号\nハイフン不要']);
    console.log('  メール:', sheetRow['メールアドレス']);
    console.log('  住所:', sheetRow['依頼者住所(物件所在と異なる場合）']);
    console.log('  物件所在地:', sheetRow['物件所在地']);
    console.log('  状況:', sheetRow['状況（当社）']);
    console.log('  コメント:', sheetRow['コメント']);
    console.log('  不通:', sheetRow['不通']);
    console.log('  査定方法:', sheetRow['査定方法']);
  } else {
    console.log('  ❌ Not found in spreadsheet');
  }

  // 3. 監査ログを確認（最近の更新履歴）
  console.log('\n📊 Recent update history (audit log):');
  const { data: auditLogs, error: auditError } = await supabase
    .from('seller_sync_logs')
    .select('*')
    .eq('seller_number', 'AA13496')
    .order('synced_at', { ascending: false })
    .limit(5);

  if (auditError) {
    console.log('  ⚠️ No audit log table or error:', auditError.message);
  } else if (auditLogs && auditLogs.length > 0) {
    auditLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ${log.synced_at} - ${log.sync_direction} - ${log.status}`);
    });
  } else {
    console.log('  ℹ️ No recent sync logs found');
  }
}

checkAA13496CurrentState().catch(console.error);
