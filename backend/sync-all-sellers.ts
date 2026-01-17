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

async function syncAllSellers() {
  console.log('🔄 Starting full seller sync from spreadsheet...\n');

  try {
    // Initialize Google Sheets client
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const columnMapper = new ColumnMapper();
    const propertySyncHandler = new PropertySyncHandler(supabase);

    // Get all rows from spreadsheet
    console.log('📊 Fetching data from spreadsheet...');
    const rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows in spreadsheet\n`);

    let updated = 0;
    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
      try {
        const sellerNumber = row['売主番号'];
        if (!sellerNumber) {
          skipped++;
          continue;
        }

        // Map spreadsheet data to database format
        const mappedData = columnMapper.mapToDatabase(row);
        
        // Check if seller exists
        const { data: existing } = await supabase
          .from('sellers')
          .select('id')
          .eq('seller_number', sellerNumber)
          .maybeSingle();

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

        // 査定額を取得（手入力優先）
        const valuation1 = row['査定額1'] || row['査定額1（自動計算）v'];
        const valuation2 = row['査定額2'] || row['査定額2（自動計算）v'];
        const valuation3 = row['査定額3'] || row['査定額3（自動計算）v'];
        const val1 = parseNumeric(valuation1);
        const val2 = parseNumeric(valuation2);
        const val3 = parseNumeric(valuation3);

        if (existing) {
          // Update existing seller
          const updateData: any = {
            name: mappedData.name ? encrypt(mappedData.name) : null,
            address: mappedData.address ? encrypt(mappedData.address) : null,
            phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
            email: mappedData.email ? encrypt(mappedData.email) : null,
            inquiry_site: mappedData.inquiry_site || null,
            inquiry_date: mappedData.inquiry_date || null,
            status: mappedData.status || null,
            confidence: mappedData.confidence || null,
            next_call_date: mappedData.next_call_date || null,
            contract_year_month: mappedData.contract_year_month || null,
            competitor_name: mappedData.competitor_name || null,
            competitor_name_and_reason: mappedData.competitor_name_and_reason || null,
            exclusive_other_decision_factor: mappedData.exclusive_other_decision_factor || null,
            visit_date: mappedData.visit_date || null,
            visit_time: mappedData.visit_time || null,
            visit_assignee: mappedData.visit_assignee || null,
            valuation_assignee: mappedData.valuation_assignee || null,
            phone_assignee: mappedData.phone_assignee || null,
            comments: mappedData.comments || null,
            updated_at: new Date().toISOString(),
          };
          
          // 査定額を追加（万円→円に変換）
          if (val1 !== null) updateData.valuation_amount_1 = val1 * 10000;
          if (val2 !== null) updateData.valuation_amount_2 = val2 * 10000;
          if (val3 !== null) updateData.valuation_amount_3 = val3 * 10000;

          const { error } = await supabase
            .from('sellers')
            .update(updateData)
            .eq('id', existing.id);

          if (error) {
            console.error(`❌ Error updating ${sellerNumber}:`, error.message);
            errors++;
          } else {
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
            
            updated++;
            if (updated % 100 === 0) {
              console.log(`  Updated ${updated} sellers...`);
            }
          }
        } else {
          // Create new seller
          const insertData: any = {
            seller_number: sellerNumber,
            name: mappedData.name ? encrypt(mappedData.name) : null,
            address: mappedData.address ? encrypt(mappedData.address) : null,
            phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
            email: mappedData.email ? encrypt(mappedData.email) : null,
            inquiry_site: mappedData.inquiry_site || null,
            inquiry_date: mappedData.inquiry_date || null,
            status: mappedData.status || '追客中',
            confidence: mappedData.confidence || null,
            next_call_date: mappedData.next_call_date || null,
            contract_year_month: mappedData.contract_year_month || null,
            competitor_name: mappedData.competitor_name || null,
            competitor_name_and_reason: mappedData.competitor_name_and_reason || null,
            exclusive_other_decision_factor: mappedData.exclusive_other_decision_factor || null,
            visit_date: mappedData.visit_date || null,
            visit_time: mappedData.visit_time || null,
            visit_assignee: mappedData.visit_assignee || null,
            valuation_assignee: mappedData.valuation_assignee || null,
            phone_assignee: mappedData.phone_assignee || null,
            comments: mappedData.comments || null,
          };
          
          // 査定額を追加（万円→円に変換）
          if (val1 !== null) insertData.valuation_amount_1 = val1 * 10000;
          if (val2 !== null) insertData.valuation_amount_2 = val2 * 10000;
          if (val3 !== null) insertData.valuation_amount_3 = val3 * 10000;

          const { data: newSeller, error } = await supabase
            .from('sellers')
            .insert(insertData)
            .select()
            .single();

          if (error) {
            console.error(`❌ Error creating ${sellerNumber}:`, error.message);
            errors++;
          } else {
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
            created++;
          }
        }
      } catch (error) {
        console.error(`❌ Error processing row:`, error);
        errors++;
      }
    }

    console.log('\n✅ Sync completed!');
    console.log(`📊 Summary:`);
    console.log(`  - Updated: ${updated}`);
    console.log(`  - Created: ${created}`);
    console.log(`  - Skipped: ${skipped}`);
    console.log(`  - Errors: ${errors}`);

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

syncAllSellers().catch(console.error);
