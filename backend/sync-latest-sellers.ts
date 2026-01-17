/**
 * 最新の売主のみを同期するスクリプト
 * AA13236以降（12/8以降）のデータのみをスプレッドシートから同期します
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

// 同期対象の売主番号（12/8以降のデータ）
const TARGET_SELLER_NUMBERS = [
  'AA13236', 'AA13237', // 12/8
  'AA13239', 'AA13240', 'AA13241', 'AA13242', 'AA13243', 'AA13244', // 12/9
];

async function syncLatestSellers() {
  console.log('🔄 最新の売主を同期します...\n');
  console.log(`対象: ${TARGET_SELLER_NUMBERS.join(', ')}\n`);
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
    const allRows = await sheetsClient.readAll();
    console.log(`✅ ${allRows.length}行のデータを取得しました\n`);

    // 対象の売主のみをフィルタ
    const targetRows = allRows.filter((row: any) => {
      const sellerNumber = row['売主番号'];
      return TARGET_SELLER_NUMBERS.includes(sellerNumber);
    });

    console.log(`🎯 対象売主: ${targetRows.length}件\n`);

    if (targetRows.length === 0) {
      console.log('⚠️ 対象の売主が見つかりませんでした');
      return;
    }

    // 同期実行
    let successCount = 0;
    let errorCount = 0;

    for (const row of targetRows) {
      const sellerNumber = row['売主番号'];
      
      try {
        // 既存チェック
        const { data: existing } = await supabase
          .from('sellers')
          .select('id')
          .eq('seller_number', sellerNumber)
          .maybeSingle();

        // スプレッドシートデータをDB形式に変換
        const mappedData = columnMapper.mapToDatabase(row);
        
        // 査定額を取得（手入力優先、なければ自動計算）
        const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
        const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
        const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];

        // 物件情報を直接スプレッドシートから取得
        const propertyAddress = row['物件所在地'] || '未入力';
        let propertyType = row['種別'];
        if (propertyType) {
          const typeStr = String(propertyType).trim();
          const typeMapping: Record<string, string> = {
            '土': '土地', '戸': '戸建', 'マ': 'マンション', '事': '事業用',
          };
          propertyType = typeMapping[typeStr] || typeStr;
        }

        if (existing) {
          // 既存データを更新
          const updateData: any = {
            name: mappedData.name ? encrypt(mappedData.name) : null,
            address: mappedData.address ? encrypt(mappedData.address) : null,
            phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
            email: mappedData.email ? encrypt(mappedData.email) : null,
            site: mappedData.site || row['サイト'] || null,
            inquiry_date: mappedData.inquiry_date || null,
            inquiry_year: mappedData.inquiry_year || null,
            status: mappedData.status || null,
            confidence: mappedData.confidence || null,
            next_call_date: mappedData.next_call_date || null,
            comments: mappedData.comments || null,
            updated_at: new Date().toISOString(),
          };

          // 査定額を追加
          const val1 = parseNumeric(valuation1);
          const val2 = parseNumeric(valuation2);
          const val3 = parseNumeric(valuation3);
          if (val1 !== null) updateData.valuation_amount_1 = val1 * 10000;
          if (val2 !== null) updateData.valuation_amount_2 = val2 * 10000;
          if (val3 !== null) updateData.valuation_amount_3 = val3 * 10000;

          const { error } = await supabase
            .from('sellers')
            .update(updateData)
            .eq('id', existing.id);

          if (error) throw new Error(error.message);
          
          // 物件情報を同期
          await propertySyncHandler.syncProperty(existing.id, {
            address: String(propertyAddress),
            property_type: propertyType ? String(propertyType) : undefined,
            land_area: parseNumeric(row['土（㎡）']) ?? undefined,
            building_area: parseNumeric(row['建（㎡）']) ?? undefined,
            build_year: parseNumeric(row['築年']) ?? undefined,
            structure: row['構造'] ? String(row['構造']) : undefined,
            seller_situation: row['状況（売主）'] ? String(row['状況（売主）']) : undefined,
            floor_plan: row['間取り'] ? String(row['間取り']) : undefined,
          });

          successCount++;
          console.log(`✅ ${sellerNumber}: 更新完了`);
        } else {
          // 新規作成
          const encryptedData: any = {
            seller_number: sellerNumber,
            name: mappedData.name ? encrypt(mappedData.name) : null,
            address: mappedData.address ? encrypt(mappedData.address) : null,
            phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
            email: mappedData.email ? encrypt(mappedData.email) : null,
            site: mappedData.site || row['サイト'] || null,
            inquiry_date: mappedData.inquiry_date || null,
            inquiry_year: mappedData.inquiry_year || null,
            status: mappedData.status || '追客中',
            confidence: mappedData.confidence || null,
            next_call_date: mappedData.next_call_date || null,
            comments: mappedData.comments || null,
          };

          // 査定額を追加
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

          if (insertError) throw new Error(insertError.message);

          // 物件情報を同期
          if (newSeller) {
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
        }
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

    // 確認
    console.log('\n📊 同期後の確認...');
    const { data: latestSellers } = await supabase
      .from('sellers')
      .select('seller_number, inquiry_date')
      .order('inquiry_date', { ascending: false })
      .limit(10);
    
    console.log('【最新の反響日付TOP10】');
    latestSellers?.forEach((s: any, i: number) => {
      console.log(`${i+1}. ${s.seller_number}: ${s.inquiry_date}`);
    });

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

syncLatestSellers().catch(console.error);
