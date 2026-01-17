/**
 * Check for property type mismatches between spreadsheet and database
 * Specifically looking for cases where spreadsheet = "マ" but DB shows something else
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
  console.log('=== Property Type Mismatch Check (Sheet=マ but DB≠マ) ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();

  // Get spreadsheet data
  const rows = await sheetsClient.readAll();
  
  console.log(`Total rows in spreadsheet: ${rows.length}`);

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

  // Create a map of seller_number -> property_type from DB
  const dbMap = new Map<string, { id: string; property_type: string | null }>();
  for (const seller of sellers || []) {
    const property = Array.isArray(seller.properties) 
      ? seller.properties[0] 
      : seller.properties;
    
    if (property) {
      dbMap.set(seller.seller_number, {
        id: seller.id,
        property_type: property.property_type,
      });
    }
  }

  // Find mismatches where sheet = "マ" but DB is not "マ"
  const mismatches: Array<{
    sellerNumber: string;
    sheetValue: string;
    dbValue: string | null;
  }> = [];

  for (const row of rows) {
    const sellerNumber = row['売主番号']?.toString().trim();
    const sheetPropertyType = row['種別']?.toString().trim();

    if (!sellerNumber) continue;

    // Only check cases where sheet = "マ"
    if (sheetPropertyType === 'マ') {
      const dbData = dbMap.get(sellerNumber);
      if (dbData && dbData.property_type !== 'マ') {
        mismatches.push({
          sellerNumber,
          sheetValue: sheetPropertyType,
          dbValue: dbData.property_type,
        });
      }
    }
  }

  console.log(`=== Results ===`);
  console.log(`Total mismatches (Sheet=マ, DB≠マ): ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('Mismatches:');
    for (const m of mismatches) {
      console.log(`  ${m.sellerNumber}: Sheet="マ" → DB="${m.dbValue}"`);
    }
  } else {
    console.log('✅ No mismatches found! All "マ" entries in spreadsheet match DB.');
  }
}

main().catch(console.error);
