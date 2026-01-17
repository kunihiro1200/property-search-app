/**
 * 物件情報がない売主を検出して修復するスクリプト
 * 
 * 問題: 一部の同期経路で物件情報が作成されていなかった
 * 対策: スプレッドシートから物件情報を取得して同期
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

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

async function fixMissingProperties() {
  console.log('=== 物件情報がない売主を検出・修復 ===\n');
  const startTime = Date.now();

  try {
    // 1. 物件情報がない売主を検出
    console.log('【1. 物件情報がない売主を検出】');
    
    // 全売主を取得
    const { data: allSellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, seller_number');
    
    if (sellersError) {
      throw new Error(`売主取得エラー: ${sellersError.message}`);
    }

    // 全物件を取得
    const { data: allProperties, error: propsError } = await supabase
      .from('properties')
      .select('seller_id');
    
    if (propsError) {
      throw new Error(`物件取得エラー: ${propsError.message}`);
    }

    // 物件がある売主IDのセット
    const sellersWithProperty = new Set(allProperties?.map(p => p.seller_id) || []);

    // 物件がない売主を特定
    const sellersWithoutProperty = allSellers?.filter(s => !sellersWithProperty.has(s.id)) || [];

    console.log(`全売主数: ${allSellers?.length || 0}`);
    console.log(`物件情報がない売主: ${sellersWithoutProperty.length}件\n`);

    if (sellersWithoutProperty.length === 0) {
      console.log('✅ すべての売主に物件情報があります');
      return;
    }

    // 2. スプレッドシートからデータを取得
    console.log('【2. スプレッドシートからデータを取得】');
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    console.log(`スプレッドシート行数: ${allRows.length}\n`);

    // 売主番号でマップを作成
    const sheetDataMap = new Map<string, any>();
    allRows.forEach((row: any) => {
      const sellerNumber = row['売主番号'];
      if (sellerNumber) {
        sheetDataMap.set(sellerNumber, row);
      }
    });

    // 3. 物件情報を同期
    console.log('【3. 物件情報を同期】');
    const propertySyncHandler = new PropertySyncHandler(supabase);
    
    let successCount = 0;
    let errorCount = 0;
    let notFoundCount = 0;

    for (const seller of sellersWithoutProperty) {
      const row = sheetDataMap.get(seller.seller_number);
      
      if (!row) {
        console.log(`⚠️ ${seller.seller_number}: スプレッドシートにデータなし`);
        notFoundCount++;
        continue;
      }

      try {
        const propertyAddress = row['物件所在地'] || '未入力';
        let propertyType = row['種別'];
        
        // 物件種別の正規化
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

        const result = await propertySyncHandler.syncProperty(seller.id, {
          address: String(propertyAddress),
          property_type: propertyType ? String(propertyType) : undefined,
          land_area: parseNumeric(row['土（㎡）']) ?? undefined,
          building_area: parseNumeric(row['建（㎡）']) ?? undefined,
          build_year: parseNumeric(row['築年']) ?? undefined,
          structure: row['構造'] ? String(row['構造']) : undefined,
          seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
          floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
        });

        if (result.success) {
          successCount++;
          console.log(`✅ ${seller.seller_number}: 物件情報を作成`);
        } else {
          errorCount++;
          console.error(`❌ ${seller.seller_number}: ${result.error}`);
        }
      } catch (error: any) {
        errorCount++;
        console.error(`❌ ${seller.seller_number}: ${error.message}`);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n🎉 修復完了！`);
    console.log(`   成功: ${successCount}件`);
    console.log(`   失敗: ${errorCount}件`);
    console.log(`   スプレッドシートにデータなし: ${notFoundCount}件`);
    console.log(`   処理時間: ${duration.toFixed(2)}秒`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    throw error;
  }
}

fixMissingProperties().catch(console.error);
