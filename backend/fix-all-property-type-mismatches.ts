/**
 * Fix ALL property type mismatches between spreadsheet and database
 * Updates database to match spreadsheet values
 */

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function main() {
  console.log('=== Fix ALL Property Type Mismatches ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();

  // Get spreadsheet data
  const rows = await sheetsClient.readAll();
  console.log(`Total rows in spreadsheet: ${rows.length}`);

  // Create a map of seller_number -> property_type from spreadsheet
  const sheetMap = new Map<string, string | null>();
  for (const row of rows) {
    const sellerNumber = row['売主番号']?.toString().trim();
    const propertyType = row['種別']?.toString().trim() || null;
    if (sellerNumber) {
      sheetMap.set(sellerNumber, propertyType);
    }
  }

  // Get all sellers with properties from DB
  const { data: sellers, error } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      properties (
        id,
        property_type
      )
    `)
    .order('seller_number');

  if (error) {
    console.error('Error fetching sellers:', error);
    return;
  }

  console.log(`Total sellers in DB: ${sellers?.length || 0}`);
  console.log('');

  // Find all mismatches
  const mismatches: Array<{
    sellerNumber: string;
    propertyId: string;
    dbValue: string | null;
    sheetValue: string | null;
  }> = [];

  for (const seller of sellers || []) {
    const property = Array.isArray(seller.properties) 
      ? seller.properties[0] 
      : seller.properties;
    
    if (!property) continue;

    const sheetValue = sheetMap.get(seller.seller_number) ?? null;
    const dbValue = property.property_type ?? null;

    // Check if values differ
    if (dbValue !== sheetValue) {
      mismatches.push({
        sellerNumber: seller.seller_number,
        propertyId: property.id,
        dbValue,
        sheetValue,
      });
    }
  }

  console.log(`Total mismatches found: ${mismatches.length}\n`);

  if (mismatches.length === 0) {
    console.log('✅ No mismatches found!');
    return;
  }

  // Show summary
  const byType = {
    nullToValue: mismatches.filter(m => !m.dbValue && m.sheetValue),
    valueToNull: mismatches.filter(m => m.dbValue && !m.sheetValue),
    valueToValue: mismatches.filter(m => m.dbValue && m.sheetValue),
  };

  console.log('Summary:');
  console.log(`  DB=null → Sheet has value: ${byType.nullToValue.length}`);
  console.log(`  DB has value → Sheet=null: ${byType.valueToNull.length}`);
  console.log(`  Both have different values: ${byType.valueToValue.length}`);
  console.log('');

  // Apply fixes
  console.log('Applying fixes...\n');
  
  let fixed = 0;
  let errors = 0;

  for (const m of mismatches) {
    try {
      const { error: updateError } = await supabase
        .from('properties')
        .update({ property_type: m.sheetValue })
        .eq('id', m.propertyId);

      if (updateError) {
        console.error(`❌ ${m.sellerNumber}: ${updateError.message}`);
        errors++;
      } else {
        console.log(`✅ ${m.sellerNumber}: "${m.dbValue}" → "${m.sheetValue}"`);
        fixed++;
      }
    } catch (err: any) {
      console.error(`❌ ${m.sellerNumber}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n=== RESULT ===');
  console.log(`Fixed: ${fixed}`);
  console.log(`Errors: ${errors}`);
}

main().catch(console.error);
