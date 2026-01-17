/**
 * AA4885 ATBB状態チェックスクリプト
 * スプレッドシートとDBのATBB状態を比較
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkAA4885() {
  console.log('='.repeat(60));
  console.log('AA4885 ATBB状態診断');
  console.log('='.repeat(60));
  console.log();

  try {
    // 1. スプレッドシートから取得
    console.log('📊 Step 1: スプレッドシートからデータ取得');
    console.log('-'.repeat(60));
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    const allRows = await sheetsClient.readAll();
    
    const row = allRows.find(r => r['物件番号'] === 'AA4885');
    
    if (!row) {
      console.log('❌ AA4885がスプレッドシートに見つかりません');
      return;
    }
    
    console.log('✅ スプレッドシートで発見');
    console.log();
    console.log('重要フィールド:');
    console.log(`  物件番号: ${row['物件番号']}`);
    console.log(`  状況: ${row['状況']}`);
    console.log(`  atbb成約済み/非公開: "${row['atbb成約済み/非公開']}"`);
    console.log(`  種別: ${row['種別']}`);
    console.log(`  所在地: ${row['所在地']}`);
    console.log();

    // 2. DBから取得
    console.log('💾 Step 2: DBからデータ取得');
    console.log('-'.repeat(60));
    
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: dbProperty, error: dbError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (dbError || !dbProperty) {
      console.log('❌ AA4885がDBに見つかりません:', dbError?.message);
      return;
    }
    
    console.log('✅ DBで発見');
    console.log();
    console.log('重要フィールド:');
    console.log(`  property_number: ${dbProperty.property_number}`);
    console.log(`  status: ${dbProperty.status}`);
    console.log(`  atbb_status: "${dbProperty.atbb_status}"`);
    console.log(`  property_type: ${dbProperty.property_type}`);
    console.log(`  address: ${dbProperty.address}`);
    console.log(`  updated_at: ${dbProperty.updated_at}`);
    console.log();

    // 3. 比較
    console.log('🔍 Step 3: ATBB状態の比較');
    console.log('-'.repeat(60));
    
    const spreadsheetAtbb = String(row['atbb成約済み/非公開'] || '').trim();
    const dbAtbb = String(dbProperty.atbb_status || '').trim();
    
    console.log(`スプレッドシート: "${spreadsheetAtbb}"`);
    console.log(`DB:              "${dbAtbb}"`);
    console.log();
    
    if (spreadsheetAtbb === dbAtbb) {
      console.log('✅ 一致 - 同期の必要なし');
    } else {
      console.log('❌ 不一致 - 同期が必要');
      console.log();
      console.log('📝 診断結果:');
      console.log('  スプレッドシートの値がDBに反映されていません。');
      console.log('  自動同期が動作していない可能性があります。');
      console.log();
      console.log('💡 推奨アクション:');
      console.log('  1. 自動同期サービスが起動しているか確認');
      console.log('  2. sync_logsテーブルで最近の同期ログを確認');
      console.log('  3. 手動同期を実行してテスト');
    }
    
    console.log();
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

checkAA4885().catch(console.error);
