/**
 * 最新売主の物件情報と査定額をスプレッドシートから完全同期するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// 同期対象の売主番号（最新の売主）
const TARGET_SELLERS = ['AA13236', 'AA13237', 'AA13239', 'AA13240', 'AA13241', 'AA13242', 'AA13243', 'AA13244'];

async function syncLatestSellersComplete() {
  console.log('=== 最新売主の物件情報と査定額を完全同期 ===\n');

  try {
    // Google Sheets クライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const propertySyncHandler = new PropertySyncHandler(supabase);

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    for (const sellerNumber of TARGET_SELLERS) {
      console.log(`\n【${sellerNumber}】`);
      
      // スプレッドシートから該当行を取得
      const row = allRows.find((r: any) => r['売主番号'] === sellerNumber);
      if (!row) {
        console.log(`  ❌ スプレッドシートに見つかりません`);
        continue;
      }

      // DBから売主IDを取得
      const { data: seller, error: sellerError } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .single();

      if (sellerError || !seller) {
        console.log(`  ❌ DBに売主が見つかりません`);
        continue;
      }

      // 物件情報を直接スプレッドシートから取得
      const propertyAddress = String(row['物件所在地'] || '未入力');
      const propertyType = row['種別'] ? String(row['種別']) : undefined;
      const landArea = row['土（㎡）'];
      const buildingArea = row['建（㎡）'];
      const buildYear = row['築年'];
      const structure = row['構造'] ? String(row['構造']) : undefined;
      const floorPlan = row['間取り'] ? String(row['間取り']) : undefined;
      const sellerSituation = row['状況（売主）'] ? String(row['状況（売主）']) : undefined;
      
      console.log(`  📍 物件情報:`);
      console.log(`    住所: ${propertyAddress}`);
      console.log(`    種別: ${propertyType || '未設定'}`);
      console.log(`    土地面積: ${landArea || '未設定'}`);
      console.log(`    建物面積: ${buildingArea || '未設定'}`);
      console.log(`    築年: ${buildYear || '未設定'}`);
      console.log(`    構造: ${structure || '未設定'}`);
      console.log(`    間取り: ${floorPlan || '未設定'}`);
      console.log(`    売主状況: ${sellerSituation || '未設定'}`);

      // 査定額を取得（手入力優先、なければ自動計算）
      const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
      const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
      const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
      
      console.log(`  💰 査定額:`);
      console.log(`    査定額1: ${valuation1 ? `${valuation1}万円` : '未設定'}`);
      console.log(`    査定額2: ${valuation2 ? `${valuation2}万円` : '未設定'}`);
      console.log(`    査定額3: ${valuation3 ? `${valuation3}万円` : '未設定'}`);

      // 物件情報を同期
      try {
        // 物件種別の正規化
        let normalizedPropertyType = propertyType;
        if (propertyType) {
          const typeStr = String(propertyType).trim();
          const typeMapping: Record<string, string> = {
            '土': '土地',
            '戸': '戸建',
            'マ': 'マンション',
            '事': '事業用',
          };
          normalizedPropertyType = typeMapping[typeStr] || typeStr;
        }

        await propertySyncHandler.syncProperty(seller.id, {
          address: propertyAddress,
          property_type: normalizedPropertyType || undefined,
          land_area: parseNumeric(landArea) ?? undefined,
          building_area: parseNumeric(buildingArea) ?? undefined,
          build_year: parseNumeric(buildYear) ?? undefined,
          structure: structure,
          seller_situation: sellerSituation,
          floor_plan: floorPlan,
        });
        console.log(`  ✅ 物件情報を同期しました`);
      } catch (error: any) {
        console.log(`  ❌ 物件同期エラー: ${error.message}`);
      }

      // 査定額を売主テーブルに同期
      try {
        const updateData: any = {
          updated_at: new Date().toISOString(),
        };
        
        const val1 = parseNumeric(valuation1);
        const val2 = parseNumeric(valuation2);
        const val3 = parseNumeric(valuation3);
        
        if (val1 !== null) {
          updateData.valuation_amount_1 = val1 * 10000; // 万円→円
        }
        if (val2 !== null) {
          updateData.valuation_amount_2 = val2 * 10000;
        }
        if (val3 !== null) {
          updateData.valuation_amount_3 = val3 * 10000;
        }

        if (Object.keys(updateData).length > 1) { // updated_at以外にフィールドがある場合
          const { error: updateError } = await supabase
            .from('sellers')
            .update(updateData)
            .eq('id', seller.id);

          if (updateError) {
            console.log(`  ❌ 査定額更新エラー: ${updateError.message}`);
          } else {
            console.log(`  ✅ 査定額を同期しました`);
          }
        } else {
          console.log(`  ℹ️ 査定額データなし`);
        }
      } catch (error: any) {
        console.log(`  ❌ 査定額同期エラー: ${error.message}`);
      }
    }

    console.log('\n=== 同期完了 ===');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

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

syncLatestSellersComplete().catch(console.error);
