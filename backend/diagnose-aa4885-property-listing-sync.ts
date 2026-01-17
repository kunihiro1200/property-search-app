import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

interface Difference {
  field: string;
  sheet: string | number | null;
  db: any;
}

async function diagnoseAA4885() {
  console.log('=== AA4885 物件リスト同期診断 ===\n');
  
  const propertyNumber = 'AA4885';
  
  // 1. スプレッドシートのデータ取得
  console.log('1. スプレッドシートのデータ');
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件リスト',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const allData = await sheetsClient.readAll();
  const sheetRow = allData.find(row => row['物件番号'] === propertyNumber);
  
  if (!sheetRow) {
    console.log('❌ スプレッドシートに存在しません');
    return;
  }
  
  console.log('✅ スプレッドシートに存在');
  console.log(`   ATBB状況: "${sheetRow['atbb成約済み/非公開']}"`);
  console.log(`   状況: "${sheetRow['状況']}"`);
  console.log(`   格納先URL: "${sheetRow['格納先URL']}"`);
  console.log('');
  
  // 2. データベースのデータ取得
  console.log('2. データベースのデータ');
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (error || !dbData) {
    console.log('❌ データベースに存在しません');
    console.log(`   エラー: ${error?.message}`);
    return;
  }
  
  console.log('✅ データベースに存在');
  console.log(`   ATBB状況: "${dbData.atbb_status}"`);
  console.log(`   状況: "${dbData.status}"`);
  console.log(`   格納先URL: "${dbData.storage_location}"`);
  console.log(`   最終更新: ${dbData.updated_at}`);
  console.log('');
  
  // 3. 差分の確認
  console.log('3. 差分の確認');
  const differences: Difference[] = [];
  
  if (sheetRow['atbb成約済み/非公開'] !== dbData.atbb_status) {
    differences.push({
      field: 'ATBB状況',
      sheet: sheetRow['atbb成約済み/非公開'],
      db: dbData.atbb_status
    });
  }
  
  if (sheetRow['状況'] !== dbData.status) {
    differences.push({
      field: '状況',
      sheet: sheetRow['状況'],
      db: dbData.status
    });
  }
  
  if (sheetRow['格納先URL'] !== dbData.storage_location) {
    differences.push({
      field: '格納先URL',
      sheet: sheetRow['格納先URL'],
      db: dbData.storage_location
    });
  }
  
  if (differences.length === 0) {
    console.log('✅ 差分なし - データは一致しています');
  } else {
    console.log(`❌ ${differences.length}件の差分が見つかりました:`);
    differences.forEach(diff => {
      console.log(`\n   ${diff.field}:`);
      console.log(`   スプレッドシート: "${diff.sheet}"`);
      console.log(`   データベース: "${diff.db}"`);
    });
  }
  console.log('');
  
  // 4. 同期ログの確認
  console.log('4. 同期ログの確認');
  const { data: logs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('sync_type', 'property_listing_update')
    .order('started_at', { ascending: false })
    .limit(5);
  
  if (!logs || logs.length === 0) {
    console.log('❌ 同期ログが見つかりません');
    console.log('   → 自動同期が一度も実行されていない可能性があります');
  } else {
    console.log(`✅ 同期ログ: ${logs.length}件`);
    console.log(`   最終実行: ${logs[0].started_at}`);
    console.log(`   ステータス: ${logs[0].status}`);
    if (logs[0].properties_updated) {
      console.log(`   更新件数: ${logs[0].properties_updated}`);
    }
  }
  console.log('');
  
  // 5. 診断結果のサマリー
  console.log('=== 診断結果サマリー ===');
  
  if (differences.length > 0) {
    console.log('❌ AA4885のデータに不一致があります');
    console.log('');
    console.log('推奨される対応:');
    console.log('1. 手動で即座に同期する場合:');
    console.log('   npx ts-node backend/force-sync-aa4885.ts');
    console.log('');
    console.log('2. 自動同期を確認する場合:');
    console.log('   npx ts-node backend/diagnose-auto-sync-service.ts');
    console.log('');
  } else {
    console.log('✅ AA4885のデータは一致しています');
  }
}

diagnoseAA4885().catch(console.error);
