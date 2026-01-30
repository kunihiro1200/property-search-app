/**
 * AA13494の削除同期状態を確認するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13494Status() {
  console.log('🔍 AA13494の削除同期状態を確認中...\n');

  // 1. データベースでAA13494を確認
  console.log('📊 1. データベースの状態:');
  const { data: dbSeller, error: dbError } = await supabase
    .from('sellers')
    .select('id, seller_number, name, status, deleted_at, created_at, updated_at')
    .eq('seller_number', 'AA13494')
    .single();

  if (dbError) {
    console.log(`   ❌ エラー: ${dbError.message}`);
  } else if (dbSeller) {
    console.log(`   ✅ データベースに存在`);
    console.log(`   - ID: ${dbSeller.id}`);
    console.log(`   - 売主番号: ${dbSeller.seller_number}`);
    console.log(`   - 名前: ${dbSeller.name}`);
    console.log(`   - ステータス: ${dbSeller.status}`);
    console.log(`   - deleted_at: ${dbSeller.deleted_at || '(null - アクティブ)'}`);
    console.log(`   - created_at: ${dbSeller.created_at}`);
    console.log(`   - updated_at: ${dbSeller.updated_at}`);
  } else {
    console.log(`   ❌ データベースに存在しない`);
  }

  // 2. スプレッドシートでAA13494を確認
  console.log('\n📊 2. スプレッドシートの状態:');
  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
    const sheetName = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

    // B列（売主番号）を検索
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!B:B`,
    });

    const rows = response.data.values || [];
    let foundInSheet = false;
    let rowIndex = -1;

    for (let i = 0; i < rows.length; i++) {
      if (rows[i][0] === 'AA13494') {
        foundInSheet = true;
        rowIndex = i + 1; // 1-indexed
        break;
      }
    }

    if (foundInSheet) {
      console.log(`   ✅ スプレッドシートに存在（行: ${rowIndex}）`);
    } else {
      console.log(`   ❌ スプレッドシートに存在しない（削除済み）`);
    }
  } catch (error: any) {
    console.log(`   ❌ スプレッドシート確認エラー: ${error.message}`);
  }

  // 3. 削除監査ログを確認
  console.log('\n📊 3. 削除監査ログの状態:');
  const { data: auditLog, error: auditError } = await supabase
    .from('seller_deletion_audit')
    .select('*')
    .eq('seller_number', 'AA13494')
    .order('deleted_at', { ascending: false })
    .limit(1);

  if (auditError) {
    console.log(`   ❌ エラー: ${auditError.message}`);
  } else if (auditLog && auditLog.length > 0) {
    const log = auditLog[0];
    console.log(`   ✅ 削除監査ログに存在`);
    console.log(`   - ID: ${log.id}`);
    console.log(`   - deleted_at: ${log.deleted_at}`);
    console.log(`   - deleted_by: ${log.deleted_by}`);
    console.log(`   - reason: ${log.reason}`);
    console.log(`   - recovered_at: ${log.recovered_at || '(null - 未復元)'}`);
  } else {
    console.log(`   ❌ 削除監査ログに存在しない（まだ削除同期されていない）`);
  }

  // 4. 削除同期の設定を確認
  console.log('\n📊 4. 削除同期の設定:');
  console.log(`   - DELETION_SYNC_ENABLED: ${process.env.DELETION_SYNC_ENABLED || '(未設定 = true)'}`);
  console.log(`   - DELETION_VALIDATION_STRICT: ${process.env.DELETION_VALIDATION_STRICT || '(未設定 = true)'}`);
  console.log(`   - DELETION_RECENT_ACTIVITY_DAYS: ${process.env.DELETION_RECENT_ACTIVITY_DAYS || '(未設定 = 7)'}`);
  console.log(`   - DELETION_MAX_PER_SYNC: ${process.env.DELETION_MAX_PER_SYNC || '(未設定 = 100)'}`);

  // 5. 結論
  console.log('\n📋 結論:');
  if (dbSeller && !dbSeller.deleted_at) {
    console.log('   ⚠️  AA13494はデータベースにアクティブとして存在しています');
    console.log('   → スプレッドシートから削除されているなら、削除同期が実行されていない可能性があります');
    console.log('   → 次回の自動同期（5分ごと）で削除されるはずです');
    console.log('   → または、バリデーションで削除がブロックされている可能性があります');
  } else if (dbSeller && dbSeller.deleted_at) {
    console.log('   ✅ AA13494は既にソフトデリートされています');
    console.log(`   → deleted_at: ${dbSeller.deleted_at}`);
  } else {
    console.log('   ❓ AA13494はデータベースに存在しません');
  }
}

checkAA13494Status().catch(console.error);
