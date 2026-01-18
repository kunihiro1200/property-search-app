/**
 * 既存売主データに対して物件情報を一括作成
 * 
 * 使用方法:
 * npx ts-node create-properties-for-existing-sellers.ts
 */
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';

dotenv.config();

interface SellerWithoutProperty {
  id: string;
  seller_number: string;
}

async function createPropertiesForExistingSellers() {
  console.log('🔄 既存売主データに対して物件情報を一括作成します\n');

  // Supabaseクライアントを初期化
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Google Sheetsクライアントを初期化
  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  // PropertySyncHandlerを初期化
  const propertySyncHandler = new PropertySyncHandler(supabase);

  try {
    // Step 1: 物件情報がない売主を検出
    console.log('📊 Step 1: 物件情報がない売主を検出中...');
    const sellersWithoutProperty = await findSellersWithoutProperty(supabase);
    
    if (sellersWithoutProperty.length === 0) {
      console.log('✅ 全ての売主に物件情報が存在します。処理を終了します。');
      return;
    }

    console.log(`\n📥 Step 2: ${sellersWithoutProperty.length}件の売主に物件情報を作成します`);
    console.log(`   最初の数件: ${sellersWithoutProperty.slice(0, 5).map(s => s.seller_number).join(', ')}${sellersWithoutProperty.length > 5 ? '...' : ''}\n`);

    // Step 2: スプレッドシートから全データを取得
    console.log('📊 Step 3: スプレッドシートからデータを取得中...');
    const allRows = await sheetsClient.readAll();
    const rowsBySellerNumber = new Map<string, any>();
    for (const row of allRows) {
      const sellerNumber = row['売主番号'];
      if (sellerNumber) {
        rowsBySellerNumber.set(String(sellerNumber), row);
      }
    }
    console.log(`✅ ${rowsBySellerNumber.size}件のデータを取得しました\n`);

    // Step 3: 各売主に対して物件を作成
    let createdCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    const errors: Array<{ sellerNumber: string; error: string }> = [];

    for (let i = 0; i < sellersWithoutProperty.length; i++) {
      const seller = sellersWithoutProperty[i];
      const row = rowsBySellerNumber.get(seller.seller_number);

      if (!row) {
        console.log(`⚠️  ${seller.seller_number}: スプレッドシートにデータが見つかりません（スキップ）`);
        skippedCount++;
        continue;
      }

      try {
        await createPropertyForSeller(supabase, propertySyncHandler, seller, row);
        createdCount++;
        
        // 進捗状況を表示（10件ごと）
        if ((i + 1) % 10 === 0 || i === sellersWithoutProperty.length - 1) {
          console.log(`   進捗: ${i + 1}/${sellersWithoutProperty.length} (作成: ${createdCount}, スキップ: ${skippedCount}, エラー: ${errorCount})`);
        }
      } catch (error: any) {
        errorCount++;
        errors.push({
          sellerNumber: seller.seller_number,
          error: error.message,
        });
        console.error(`❌ ${seller.seller_number}: ${error.message}`);
      }
    }

    // 結果を表示
    console.log('\n📊 一括作成結果:');
    console.log(`   ✅ 作成: ${createdCount}件`);
    console.log(`   ⏭️  スキップ: ${skippedCount}件`);
    console.log(`   ❌ エラー: ${errorCount}件`);

    if (errors.length > 0) {
      console.log('\n❌ エラー詳細:');
      errors.slice(0, 10).forEach(error => {
        console.log(`   ${error.sellerNumber}: ${error.error}`);
      });
      if (errors.length > 10) {
        console.log(`   ... 他 ${errors.length - 10}件のエラー`);
      }
    }

    console.log('\n✅ 一括作成が完了しました！');

  } catch (error: any) {
    console.error('\n❌ 一括作成に失敗しました:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

/**
 * 物件情報がない売主を検出
 */
async function findSellersWithoutProperty(supabase: any): Promise<SellerWithoutProperty[]> {
  const sellersWithoutProperty: SellerWithoutProperty[] = [];
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    // 売主を取得
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, seller_number')
      .is('deleted_at', null)
      .not('seller_number', 'is', null)
      .range(offset, offset + pageSize - 1);

    if (sellersError) {
      throw new Error(`Failed to fetch sellers: ${sellersError.message}`);
    }

    if (!sellers || sellers.length === 0) {
      hasMore = false;
      break;
    }

    // 各売主に対して物件の存在を確認
    for (const seller of sellers) {
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('id')
        .eq('seller_id', seller.id)
        .limit(1)
        .maybeSingle();

      if (propertyError) {
        console.warn(`⚠️  Error checking property for ${seller.seller_number}: ${propertyError.message}`);
        continue;
      }

      if (!property) {
        sellersWithoutProperty.push(seller);
      }
    }

    offset += pageSize;

    if (sellers.length < pageSize) {
      hasMore = false;
    }
  }

  return sellersWithoutProperty;
}

/**
 * 売主に対して物件を作成
 */
async function createPropertyForSeller(
  supabase: any,
  propertySyncHandler: PropertySyncHandler,
  seller: SellerWithoutProperty,
  row: any
): Promise<void> {
  const propertyAddress = row['物件所在地'] || '未入力';
  const propertyNumber = row['物件番号'] ? String(row['物件番号']) : undefined;

  let propertyType = row['種別'];
  if (propertyType) {
    const typeStr = String(propertyType).trim();
    const typeMapping: Record<string, string> = {
      '土': '土地',
      '戸': '戸建',
      'マ': 'マンション',
      '事': '事業用',
    };
    propertyType = typeMapping[typeStr] || typeStr;
  }

  const propertyData = {
    address: String(propertyAddress),
    property_type: propertyType ? String(propertyType) : undefined,
    land_area: parseNumeric(row['土（㎡）']) ?? undefined,
    building_area: parseNumeric(row['建（㎡）']) ?? undefined,
    build_year: parseNumeric(row['築年']) ?? undefined,
    structure: row['構造'] ? String(row['構造']) : undefined,
    seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
    floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
  };

  const result = await propertySyncHandler.syncProperty(
    seller.id,
    propertyData,
    propertyNumber
  );

  if (!result.success) {
    throw new Error(`Property sync failed: ${result.error}`);
  }

  console.log(`✅ ${seller.seller_number}: 物件作成完了${propertyNumber ? ` (${propertyNumber})` : ''}`);
}

/**
 * 数値をパース
 */
function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  if (typeof value === 'number') {
    return value;
  }
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

// スクリプトを実行
createPropertiesForExistingSellers();

