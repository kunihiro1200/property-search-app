/**
 * 不足売主フル同期スクリプト（修正版）
 * 
 * Supabaseのページネーション制限を考慮して、
 * 全売主番号を正しく取得してから比較します。
 * 
 * 使用方法:
 *   npx ts-node sync-missing-sellers-fixed.ts
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';
import { encrypt } from './src/utils/encryption';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

/**
 * DBから全売主番号を取得（ページネーション対応）
 */
async function getAllDbSellerNumbers(): Promise<Set<string>> {
  const allSellerNumbers = new Set<string>();
  const pageSize = 1000;
  let offset = 0;
  let hasMore = true;

  console.log('📊 DBから全売主番号を取得中...');

  while (hasMore) {
    const { data, error } = await supabase
      .from('sellers')
      .select('seller_number')
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(`Failed to fetch DB sellers: ${error.message}`);
    }

    if (!data || data.length === 0) {
      hasMore = false;
    } else {
      for (const seller of data) {
        if (seller.seller_number) {
          allSellerNumbers.add(seller.seller_number);
        }
      }
      console.log(`   取得済み: ${allSellerNumbers.size}件 (offset: ${offset})`);
      offset += pageSize;
      
      // 取得件数がページサイズ未満なら終了
      if (data.length < pageSize) {
        hasMore = false;
      }
    }
  }

  console.log(`✅ DB売主番号取得完了: ${allSellerNumbers.size}件`);
  return allSellerNumbers;
}

/**
 * スプレッドシートから全売主番号を取得
 */
async function getAllSheetSellerNumbers(): Promise<{ numbers: Set<string>, rows: Map<string, any> }> {
  console.log('📊 スプレッドシートから全売主番号を取得中...');

  const sheetsConfig = {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  };

  const sheetsClient = new GoogleSheetsClient(sheetsConfig);
  await sheetsClient.authenticate();

  const allRows = await sheetsClient.readAll();
  const numbers = new Set<string>();
  const rows = new Map<string, any>();

  for (const row of allRows) {
    const sellerNumber = row['売主番号'];
    if (sellerNumber && typeof sellerNumber === 'string' && sellerNumber.startsWith('AA')) {
      numbers.add(sellerNumber);
      rows.set(sellerNumber, row);
    }
  }

  console.log(`✅ スプレッドシート売主番号取得完了: ${numbers.size}件`);
  return { numbers, rows };
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

/**
 * 単一の売主を同期
 */
async function syncSingleSeller(
  sellerNumber: string, 
  row: any, 
  columnMapper: ColumnMapper,
  propertySyncHandler: PropertySyncHandler
): Promise<void> {
  const mappedData = columnMapper.mapToDatabase(row);
  
  // 査定額を取得（手入力優先、なければ自動計算）
  const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
  const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
  const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

  const encryptedData: any = {
    seller_number: sellerNumber,
    name: mappedData.name ? encrypt(mappedData.name) : null,
    address: mappedData.address ? encrypt(mappedData.address) : null,
    phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
    email: mappedData.email ? encrypt(mappedData.email) : null,
    inquiry_site: mappedData.inquiry_site || null,
    inquiry_date: mappedData.inquiry_date || null,
    inquiry_year: mappedData.inquiry_year || null,
    status: mappedData.status || '追客中',
    confidence: mappedData.confidence || null,
    next_call_date: mappedData.next_call_date || null,
    comments: mappedData.comments || null,
  };

  // 査定額を追加（万円→円に変換）
  const val1 = parseNumeric(valuation1);
  const val2 = parseNumeric(valuation2);
  const val3 = parseNumeric(valuation3);
  if (val1 !== null) encryptedData.valuation_amount_1 = val1 * 10000;
  if (val2 !== null) encryptedData.valuation_amount_2 = val2 * 10000;
  if (val3 !== null) encryptedData.valuation_amount_3 = val3 * 10000;

  const { data: newSeller, error: insertError } = await supabase
    .from('sellers')
    .insert(encryptedData)
    .select()
    .single();

  if (insertError) {
    throw new Error(insertError.message);
  }

  // 物件情報を同期
  if (newSeller) {
    const propertyAddress = row['物件所在地'] || '未入力';
    let propertyType = row['種別'];
    if (propertyType) {
      const typeStr = String(propertyType).trim();
      const typeMapping: Record<string, string> = {
        '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
      };
      propertyType = typeMapping[typeStr] || typeStr;
    }

    await propertySyncHandler.syncProperty(newSeller.id, {
      address: String(propertyAddress),
      property_type: propertyType ? String(propertyType) : undefined,
      land_area: parseNumeric(row['土（㎡）']) ?? undefined,
      building_area: parseNumeric(row['建（㎡）']) ?? undefined,
      build_year: parseNumeric(row['築年']) ?? undefined,
      structure: row['構造'] ? String(row['構造']) : undefined,
      seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
      floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
    });
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔄 不足売主フル同期スクリプト（修正版）');
  console.log('='.repeat(60));
  console.log('');

  try {
    // 1. DBから全売主番号を取得（ページネーション対応）
    const dbSellerNumbers = await getAllDbSellerNumbers();

    // 2. スプレッドシートから全売主番号を取得
    const { numbers: sheetSellerNumbers, rows: sheetRows } = await getAllSheetSellerNumbers();

    // 3. 差分を計算
    console.log('');
    console.log('📊 差分を計算中...');
    const missingSellers: string[] = [];
    for (const sellerNumber of sheetSellerNumbers) {
      if (!dbSellerNumbers.has(sellerNumber)) {
        missingSellers.push(sellerNumber);
      }
    }

    // 売主番号でソート
    missingSellers.sort((a, b) => {
      const numA = parseInt(a.replace('AA', ''), 10);
      const numB = parseInt(b.replace('AA', ''), 10);
      return numA - numB;
    });

    console.log(`   スプレッドシート: ${sheetSellerNumbers.size}件`);
    console.log(`   データベース: ${dbSellerNumbers.size}件`);
    console.log(`   不足売主: ${missingSellers.length}件`);

    if (missingSellers.length === 0) {
      console.log('');
      console.log('✅ 不足売主はありません。全てのデータが同期されています。');
      return;
    }

    console.log(`   不足売主番号: ${missingSellers.slice(0, 10).join(', ')}${missingSellers.length > 10 ? '...' : ''}`);
    console.log('');

    // 4. 同期を実行
    console.log('📊 同期を実行中...');
    const columnMapper = new ColumnMapper();
    const propertySyncHandler = new PropertySyncHandler(supabase);
    
    let successCount = 0;
    let errorCount = 0;
    const errors: { sellerNumber: string; message: string }[] = [];

    for (const sellerNumber of missingSellers) {
      const row = sheetRows.get(sellerNumber);
      if (!row) {
        errors.push({ sellerNumber, message: 'Row not found in spreadsheet' });
        errorCount++;
        continue;
      }

      try {
        await syncSingleSeller(sellerNumber, row, columnMapper, propertySyncHandler);
        successCount++;
        if (successCount % 100 === 0) {
          console.log(`   進捗: ${successCount}/${missingSellers.length}件完了`);
        }
      } catch (error: any) {
        errors.push({ sellerNumber, message: error.message });
        errorCount++;
        console.error(`❌ ${sellerNumber}: ${error.message}`);
      }
    }

    console.log('');
    console.log('='.repeat(60));
    console.log('📊 同期結果');
    console.log('='.repeat(60));
    console.log(`   成功: ${successCount}件`);
    console.log(`   エラー: ${errorCount}件`);

    if (errors.length > 0 && errors.length <= 20) {
      console.log('');
      console.log('❌ エラー詳細:');
      for (const error of errors) {
        console.log(`   - ${error.sellerNumber}: ${error.message}`);
      }
    }

    console.log('');
    console.log('🎉 同期が完了しました');

  } catch (error: any) {
    console.error('');
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main().then(() => {
  process.exit(0);
}).catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
