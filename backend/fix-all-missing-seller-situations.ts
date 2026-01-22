/**
 * 物件レコードが存在しない売主に対して物件を作成し、
 * スプレッドシートから状況（売主）を含む物件情報を同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

function parseNumeric(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value).replace(/,/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

async function fixAllMissingSellerSituations() {
  console.log('=== 物件レコード作成と状況（売主）同期 ===\n');
  console.log('開始時刻:', new Date().toISOString());

  // 1. スプレッドシートから全データを取得
  console.log('\n【1. スプレッドシートからデータ取得】');
  let sheetData: any[] = [];
  
  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    sheetData = await sheetsClient.readAll();
    console.log(`スプレッドシート行数: ${sheetData.length}`);
  } catch (error: any) {
    console.error('スプレッドシート取得エラー:', error.message);
    return;
  }

  // 売主番号→シートデータのマップを作成
  const sheetMap = new Map<string, any>();
  sheetData.forEach(row => {
    const sellerNumber = row['売主番号'];
    if (sellerNumber) {
      sheetMap.set(sellerNumber, row);
    }
  });

  // 2. DBから全売主を取得
  console.log('\n【2. DBからデータ取得】');
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('id, seller_number');

  if (sellersError || !sellers) {
    console.error('売主取得エラー:', sellersError?.message);
    return;
  }
  console.log(`DB売主数: ${sellers.length}`);

  // 3. 全物件を取得
  const { data: properties, error: propsError } = await supabase
    .from('properties')
    .select('id, seller_id');

  if (propsError) {
    console.error('物件取得エラー:', propsError.message);
    return;
  }

  // 物件が存在する売主IDのセット
  const sellersWithProperty = new Set(properties?.map(p => p.seller_id) || []);

  // 4. 物件が存在しない売主を特定
  const sellersWithoutProperty = sellers.filter(s => !sellersWithProperty.has(s.id));
  console.log(`物件レコードが存在しない売主: ${sellersWithoutProperty.length}件`);

  // 5. 物件を作成して同期
  console.log('\n【3. 物件作成と同期】');
  let created = 0;
  let failed = 0;
  let noSheetData = 0;

  for (const seller of sellersWithoutProperty) {
    const sheetRow = sheetMap.get(seller.seller_number);
    
    if (!sheetRow) {
      noSheetData++;
      continue;
    }

    // 物件データを準備
    const propertyData: any = {
      seller_id: seller.id,
      address: sheetRow['物件所在地'] || '未入力',
      property_type: sheetRow['種別'] ? String(sheetRow['種別']) : null,
      land_area: parseNumeric(sheetRow['土（㎡）']),
      building_area: parseNumeric(sheetRow['建（㎡）']),
      build_year: parseNumeric(sheetRow['築年']),
      structure: sheetRow['構造'] ? String(sheetRow['構造']) : null,
      floor_plan: sheetRow['間取り'] ? String(sheetRow['間取り']) : null,
      seller_situation: sheetRow['状況（売主）'] ? String(sheetRow['状況（売主）']) : null,
    };

    // 物件を作成
    const { error: insertError } = await supabase
      .from('properties')
      .insert(propertyData);

    if (insertError) {
      console.error(`❌ ${seller.seller_number}: ${insertError.message}`);
      failed++;
    } else {
      created++;
      if (created % 100 === 0) {
        console.log(`✅ ${created}件作成完了...`);
      }
    }
  }

  console.log('\n=== 結果サマリー ===');
  console.log(`物件作成成功: ${created}件`);
  console.log(`物件作成失敗: ${failed}件`);
  console.log(`シートデータなし: ${noSheetData}件`);
  console.log('終了時刻:', new Date().toISOString());
}

fixAllMissingSellerSituations().catch(console.error);
