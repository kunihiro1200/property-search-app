import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { encrypt } from './src/utils/encryption';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Parse number
function parseNumber(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const num = parseFloat(String(value).replace(/,/g, ''));
  return isNaN(num) ? null : num;
}

async function syncTest() {
  console.log('🔄 テスト同期（最初の10件）...\n');

  try {
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    const rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows\n`);

    // Process first 10 rows
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      const sellerNumber = row['売主番号'];
      
      console.log(`\n処理中: ${sellerNumber}`);

      // Property data
      const propertyData: any = {
        address: row['物件所在地'] || row['物件住所'] || null,
        property_type: row['種別'] || row['物件種別'] || null,
        land_area: parseNumber(row['土（㎡）'] || row['土地面積']),
        building_area: parseNumber(row['建（㎡）'] || row['建物面積']),
        build_year: parseNumber(row['築年']),
        structure: row['構造'] || null,
        seller_situation: row['状況（売主）'] || null,
        floor_plan: row['間取り'] || null,
      };

      console.log(`  物件住所: ${propertyData.address}`);
      console.log(`  種別: ${propertyData.property_type}`);

      // Check if seller exists
      const { data: existing } = await supabase
        .from('sellers')
        .select('id')
        .eq('seller_number', sellerNumber)
        .maybeSingle();

      if (existing) {
        console.log(`  売主ID: ${existing.id}`);

        // Check if property exists
        const { data: existingProperty } = await supabase
          .from('properties')
          .select('id')
          .eq('seller_id', existing.id)
          .maybeSingle();

        if (existingProperty) {
          console.log(`  既存の物件ID: ${existingProperty.id}`);
          
          if (propertyData.address) {
            const { error: propError } = await supabase
              .from('properties')
              .update(propertyData)
              .eq('id', existingProperty.id);

            if (propError) {
              console.error(`  ❌ 物件更新エラー:`, propError.message);
            } else {
              console.log(`  ✅ 物件更新成功`);
            }
          }
        } else {
          console.log(`  物件なし - 新規作成`);
          
          if (propertyData.address) {
            const { data: newProperty, error: propError } = await supabase
              .from('properties')
              .insert({
                seller_id: existing.id,
                ...propertyData,
              })
              .select();

            if (propError) {
              console.error(`  ❌ 物件作成エラー:`, propError.message);
            } else {
              console.log(`  ✅ 物件作成成功:`, newProperty);
            }
          } else {
            console.log(`  ⚠️  物件住所なし - スキップ`);
          }
        }
      } else {
        console.log(`  ⚠️  売主が見つかりません`);
      }
    }

    console.log('\n✅ テスト完了');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

syncTest().catch(console.error);
