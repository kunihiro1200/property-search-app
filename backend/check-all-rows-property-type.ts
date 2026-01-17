/**
 * Check property_type for ALL rows in spreadsheet (including rows after 7000)
 * This script checks the entire spreadsheet and compares with database
 */

import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load .env file explicitly
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
const SHEET_NAME = process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト';

async function main() {
  console.log('=== Full Property Type Check (All Rows) ===\n');

  // Initialize Google Sheets
  const auth = new google.auth.GoogleAuth({
    keyFile: path.join(__dirname, 'google-service-account.json'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Get all data from spreadsheet
  console.log('Fetching spreadsheet data...');
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${SHEET_NAME}!A:Z`,
  });

  const rows = response.data.values || [];
  const headers = rows[0] || [];
  const dataRows = rows.slice(1);

  console.log(`Total rows in spreadsheet: ${dataRows.length}`);
  console.log(`Headers: ${headers.join(', ')}\n`);

  // Find column indices
  const sellerNumberIdx = headers.indexOf('売主番号');
  const propertyTypeIdx = headers.indexOf('種別');

  if (sellerNumberIdx === -1 || propertyTypeIdx === -1) {
    console.error('Required columns not found!');
    console.log('Looking for: 売主番号, 種別');
    console.log('Found headers:', headers);
    return;
  }

  console.log(`売主番号 column index: ${sellerNumberIdx}`);
  console.log(`種別 column index: ${propertyTypeIdx}\n`);

  // Get all sellers from database with properties
  console.log('Fetching database data...');
  const { data: sellers, error: dbError } = await supabase
    .from('sellers')
    .select(`
      id,
      seller_number,
      properties (
        id,
        property_type
      )
    `);

  if (dbError) {
    console.error('Database error:', dbError);
    return;
  }

  console.log(`Total sellers in database: ${sellers?.length || 0}\n`);

  // Create map of database sellers
  const dbMap = new Map<string, { sellerId: string; propertyId: string | null; propertyType: string | null }>();
  for (const seller of sellers || []) {
    const property = Array.isArray(seller.properties) && seller.properties.length > 0
      ? seller.properties[0]
      : null;
    dbMap.set(seller.seller_number, {
      sellerId: seller.id,
      propertyId: property?.id || null,
      propertyType: property?.property_type || null,
    });
  }

  // Check each row in spreadsheet
  const mismatches: Array<{
    row: number;
    sellerNumber: string;
    sheetValue: string;
    dbValue: string | null;
    inDb: boolean;
  }> = [];

  const notInDb: string[] = [];
  let checkedCount = 0;

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const rowNumber = i + 2; // +2 because of header and 0-index
    const sellerNumber = row[sellerNumberIdx];
    const sheetPropertyType = row[propertyTypeIdx] || '';

    if (!sellerNumber) continue;

    checkedCount++;
    const dbData = dbMap.get(sellerNumber);

    if (!dbData) {
      notInDb.push(sellerNumber);
      continue;
    }

    // Compare values
    const dbValue = dbData.propertyType || '';
    if (sheetPropertyType !== dbValue) {
      mismatches.push({
        row: rowNumber,
        sellerNumber,
        sheetValue: sheetPropertyType,
        dbValue: dbData.propertyType,
        inDb: true,
      });
    }
  }

  // Report results
  console.log('=== RESULTS ===\n');
  console.log(`Total rows checked: ${checkedCount}`);
  console.log(`Sellers not in database: ${notInDb.length}`);
  console.log(`Property type mismatches: ${mismatches.length}\n`);

  if (mismatches.length > 0) {
    console.log('=== MISMATCHES ===\n');
    
    // Group by row ranges
    const before7000 = mismatches.filter(m => m.row < 7000);
    const after7000 = mismatches.filter(m => m.row >= 7000);

    console.log(`Mismatches before row 7000: ${before7000.length}`);
    console.log(`Mismatches after row 7000: ${after7000.length}\n`);

    // Show first 20 mismatches
    console.log('First 20 mismatches:');
    for (const m of mismatches.slice(0, 20)) {
      console.log(`  Row ${m.row}: ${m.sellerNumber} - Sheet: "${m.sheetValue}" vs DB: "${m.dbValue}"`);
    }

    if (mismatches.length > 20) {
      console.log(`  ... and ${mismatches.length - 20} more`);
    }

    // Show mismatches after row 7000
    if (after7000.length > 0) {
      console.log('\nMismatches after row 7000 (first 30):');
      for (const m of after7000.slice(0, 30)) {
        console.log(`  Row ${m.row}: ${m.sellerNumber} - Sheet: "${m.sheetValue}" vs DB: "${m.dbValue}"`);
      }
    }
  }

  if (notInDb.length > 0) {
    console.log('\n=== SELLERS NOT IN DATABASE ===\n');
    console.log(`First 20 sellers not in database:`);
    for (const sn of notInDb.slice(0, 20)) {
      console.log(`  ${sn}`);
    }
    if (notInDb.length > 20) {
      console.log(`  ... and ${notInDb.length - 20} more`);
    }
  }

  // Save full report
  const report = {
    timestamp: new Date().toISOString(),
    totalSheetRows: dataRows.length,
    totalDbSellers: sellers?.length || 0,
    checkedCount,
    notInDbCount: notInDb.length,
    mismatchCount: mismatches.length,
    mismatchesBefore7000: mismatches.filter(m => m.row < 7000).length,
    mismatchesAfter7000: mismatches.filter(m => m.row >= 7000).length,
    mismatches,
    notInDb,
  };

  const fs = require('fs');
  fs.writeFileSync('full-property-type-report.json', JSON.stringify(report, null, 2));
  console.log('\nFull report saved to: full-property-type-report.json');
}

main().catch(console.error);
