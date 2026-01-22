/**
 * 新規売主のみを同期するスクリプト
 * DBに存在しない売主番号のデータのみをスプレッドシートから同期します
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncNewSellersOnly() {
  console.log('🔄 新規売主のみを同期します...\n');
  const startTime = Date.now();

  try {
    // Google Sheets クライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const columnMapper = new ColumnMapper();
    const propertySyncHandler = new PropertySyncHandler(supabase);

    // スプレッドシートから全データを取得
    console.log('📊 スプレッドシートからデータを取得中...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ ${rows.length}行のデータを取得しました\n`);

    // DBから既存の売主番号を取得
    console.log('📊 DBから既存の売主番号を取得中...');
    const { data: existingSellers, error: fetchError } = await supabase
      .from('sellers')
      .select('seller_number');
    
    if (fetchError) {
      throw new Error(`既存売主の取得に失敗: ${fetchError.message}`);
    }

    const existingSellerNumbers = new Set(
      existingSellers?.map((s: any) => s.seller_number) || []
    );
    console.log(`✅ ${existingSellerNumbers.size}件の既存売主を確認\n`);

    // 新規売主のみをフィルタ
    const newRows = rows.filter((row: any) => {
      const sellerNumber = row['売主番号'];
      return sellerNumber && !existingSellerNumbers.has(sellerNumber);
    });

    console.log(`🆕 新規売主: ${newRows.length}件\n`);

    if (newRows.length === 0) {
      console.log('✅ 新規売主はありません。同期完了！');
      return;
    }

    // 新規売主を同期
    let successCount = 0;
    let errorCount = 0;

    for (const row of newRows) {
      const sellerNumber = row['売主番号'];
      
      try {
        // スプレッドシートデータをDB形式に変換
        const mappedData = columnMapper.mapToDatabase(row);
        
        // 個人情報を暗号化
        const encryptedData: any = {
          seller_number: sellerNumber,
          name: mappedData.name ? encrypt(mappedData.name) : null,
          address: mappedData.address ? encrypt(mappedData.address) : null,
          phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
          email: mappedData.email ? encrypt(mappedData.email) : null,
          status: mappedData.status || '追客中',
          confidence: mappedData.confidence || null,
          inquiry_year: mappedData.inquiry_year || null,
          inquiry_date: mappedData.inquiry_date || null,
          site: mappedData.inquiry_site || null,
          next_call_date: mappedData.next_call_date || null,
          comments: mappedData.comments || null,
          visit_date: mappedData.visit_date || null,
          visit_time: mappedData.visit_time || null,
          visit_assignee: mappedData.visit_assignee || null,
        };

        // 査定額を追加（手入力優先、なければ自動計算）
        const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
        const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
        const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
        
        if (valuation1) {
          const val = parseNumeric(valuation1);
          if (val !== null) encryptedData.valuation_amount_1 = val * 10000;
        }
        if (valuation2) {
          const val = parseNumeric(valuation2);
          if (val !== null) encryptedData.valuation_amount_2 = val * 10000;
        }
        if (valuation3) {
          const val = parseNumeric(valuation3);
          if (val !== null) encryptedData.valuation_amount_3 = val * 10000;
        }

        // 売主を作成
        const { data: newSeller, error: insertError } = await supabase
          .from('sellers')
          .insert(encryptedData)
          .select()
          .single();

        if (insertError) {
          throw new Error(insertError.message);
        }

        // 物件情報を同期（直接スプレッドシートから取得）
        if (newSeller) {
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

        successCount++;
        console.log(`✅ ${sellerNumber}: 作成完了`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ ${sellerNumber}: ${error.message}`);
      }
    }

    const duration = (Date.now() - startTime) / 1000;
    console.log(`\n🎉 同期完了！`);
    console.log(`   成功: ${successCount}件`);
    console.log(`   失敗: ${errorCount}件`);
    console.log(`   処理時間: ${duration.toFixed(2)}秒`);

  } catch (error: any) {
    console.error('❌ 同期中にエラーが発生:', error.message);
    throw error;
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

syncNewSellersOnly().catch(console.error);
