import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function checkAllPropertySyncStatus() {
  console.log('=== 全物件同期状態チェック ===\n');
  
  // スプレッドシートから全データを取得
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
    sheetName: '物件',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await sheetsClient.authenticate();
  const sheetData = await sheetsClient.readAll();
  
  console.log(`📊 スプレッドシート: ${sheetData.length}件の物件`);
  
  // データベースから全データを取得
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  const { data: dbData } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, status, storage_location, updated_at');
  
  console.log(`💾 データベース: ${dbData?.length || 0}件の物件`);
  console.log('');
  
  // 差分をチェック
  console.log('🔍 差分チェック中...');
  const mismatches = [];
  
  for (const row of sheetData) {
    const propertyNumber = row['物件番号'];
    if (!propertyNumber) continue;
    
    const dbRow = dbData?.find(d => d.property_number === propertyNumber);
    if (!dbRow) {
      mismatches.push({
        propertyNumber,
        issue: 'データベースに存在しない',
      });
      continue;
    }
    
    const sheetAtbb = row['atbb成約済み/非公開'];
    const dbAtbb = dbRow.atbb_status;
    
    if (sheetAtbb !== dbAtbb) {
      mismatches.push({
        propertyNumber,
        issue: 'ATBB状況が不一致',
        sheet: sheetAtbb,
        db: dbAtbb,
      });
    }
  }
  
  console.log('');
  console.log('=== チェック結果 ===');
  
  if (mismatches.length === 0) {
    console.log('✅ すべての物件が一致しています');
  } else {
    console.log(`❌ ${mismatches.length}件の不一致が見つかりました:`);
    console.log('');
    
    mismatches.slice(0, 10).forEach(m => {
      console.log(`   ${m.propertyNumber}: ${m.issue}`);
      if (m.sheet !== undefined) {
        console.log(`      スプレッドシート: "${m.sheet}"`);
        console.log(`      データベース: "${m.db}"`);
      }
    });
    
    if (mismatches.length > 10) {
      console.log(`   ... 他 ${mismatches.length - 10}件`);
    }
    
    console.log('');
    console.log('推奨される対応:');
    console.log('1. 全物件を一括同期する場合:');
    console.log('   npx ts-node backend/sync-property-listings-updates.ts');
    console.log('');
    console.log('2. 自動同期を有効にする場合:');
    console.log('   バックエンドサーバーを起動してください');
  }
}

checkAllPropertySyncStatus().catch(console.error);
