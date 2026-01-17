import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

interface MismatchResult {
  sellerNumber: string;
  sellerId: string;
  propertyId: string;
  databaseValue: string;
  spreadsheetValue: string;
}

async function main() {
  console.log('=== 戸建て（戸）の不一致チェック ===\n');
  console.log('データベースで「戸」になっている物件を全て取得し、');
  console.log('スプレッドシートの値と比較します...\n');

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();

  try {
    // Step 1: データベースから property_type = '戸' の全レコードを取得
    console.log('📊 データベースから property_type = "戸" のレコードを取得中...');
    const { data: properties, error: dbError } = await supabase
      .from('properties')
      .select('id, seller_id, property_type')
      .eq('property_type', '戸');

    if (dbError) {
      throw new Error(`Database error: ${dbError.message}`);
    }

    if (!properties || properties.length === 0) {
      console.log('✅ データベースに property_type = "戸" のレコードはありません');
      return;
    }

    console.log(`✅ ${properties.length}件の「戸」レコードを取得しました\n`);

    // Step 2: 各レコードの売主番号を取得（バッチ処理）
    const sellerIds = properties.map(p => p.seller_id);
    const sellerMap = new Map<string, string>();
    
    // 100件ずつバッチ処理
    const batchSize = 100;
    for (let i = 0; i < sellerIds.length; i += batchSize) {
      const batch = sellerIds.slice(i, i + batchSize);
      const { data: sellers, error: sellerError } = await supabase
        .from('sellers')
        .select('id, seller_number')
        .in('id', batch);

      if (sellerError) {
        throw new Error(`Seller fetch error: ${sellerError.message}`);
      }

      sellers?.forEach(s => sellerMap.set(s.id, s.seller_number));
    }
    
    console.log(`✅ ${sellerMap.size}件の売主番号を取得しました\n`);

    // Step 3: スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const sheetData = await sheetsClient.readAll();
    console.log(`✅ ${sheetData.length}行のデータを取得しました\n`);

    // 売主番号 -> 種別 のマップを作成
    const sheetPropertyTypeMap = new Map<string, string>();
    for (const row of sheetData) {
      const sellerNumber = row['売主番号'];
      const propertyType = row['種別']; // スプレッドシートの「種別」列
      if (sellerNumber && propertyType) {
        sheetPropertyTypeMap.set(String(sellerNumber), String(propertyType));
      }
    }

    // Step 4: 不一致をチェック
    console.log('🔍 不一致をチェック中...\n');
    const mismatches: MismatchResult[] = [];

    for (const property of properties) {
      const sellerNumber = sellerMap.get(property.seller_id);
      if (!sellerNumber) {
        console.log(`⚠️  売主番号が見つかりません: seller_id=${property.seller_id}`);
        continue;
      }

      const sheetValue = sheetPropertyTypeMap.get(sellerNumber);
      
      if (!sheetValue) {
        console.log(`⚠️  ${sellerNumber}: スプレッドシートに種別データなし`);
        continue;
      }

      // データベースは「戸」、スプレッドシートが「戸」以外の場合は不一致
      if (sheetValue !== '戸') {
        mismatches.push({
          sellerNumber,
          sellerId: property.seller_id,
          propertyId: property.id,
          databaseValue: '戸',
          spreadsheetValue: sheetValue,
        });
      }
    }

    // Step 5: 結果を表示
    console.log('=== 結果 ===\n');
    console.log(`チェック対象: ${properties.length}件`);
    console.log(`不一致発見: ${mismatches.length}件\n`);

    if (mismatches.length > 0) {
      console.log('❌ 不一致が見つかりました:\n');
      
      // 種別ごとにグループ化
      const byType = new Map<string, MismatchResult[]>();
      for (const m of mismatches) {
        if (!byType.has(m.spreadsheetValue)) {
          byType.set(m.spreadsheetValue, []);
        }
        byType.get(m.spreadsheetValue)!.push(m);
      }

      // 種別ごとに表示
      for (const [type, items] of byType.entries()) {
        console.log(`\n【スプレッドシートでは「${type}」になっているもの】 (${items.length}件)`);
        for (const item of items) {
          console.log(`  ${item.sellerNumber}: DB="戸" → Sheet="${item.spreadsheetValue}"`);
        }
      }

      console.log('\n\n💡 これらを修正するには:');
      console.log('   npx ts-node fix-property-types.ts\n');
      
      process.exit(1);
    } else {
      console.log('✅ 不一致は見つかりませんでした！');
      console.log('   データベースの「戸」は全てスプレッドシートでも「戸」です。\n');
      process.exit(0);
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
