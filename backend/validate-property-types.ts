import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyTypeValidationService } from './src/services/PropertyTypeValidationService';
import { SyncLogger } from './src/services/SyncLogger';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function main() {
  const args = process.argv.slice(2);
  const sellerNumberArg = args.find(arg => arg.startsWith('--seller='));
  const sellerNumber = sellerNumberArg ? sellerNumberArg.split('=')[1] : null;

  console.log('=== Property Type Validation ===\n');

  if (sellerNumber) {
    console.log(`Validating seller: ${sellerNumber}\n`);
  } else {
    console.log('Validating all sellers\n');
  }

  // Initialize clients
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: path.join(__dirname, 'google-service-account.json'),
  });

  await sheetsClient.authenticate();

  const syncLogger = new SyncLogger(supabase);
  const validator = new PropertyTypeValidationService(
    supabase,
    sheetsClient,
    syncLogger
  );

  try {
    if (sellerNumber) {
      // Validate single seller
      const mismatch = await validator.validateSeller(sellerNumber);

      if (mismatch) {
        console.log('❌ MISMATCH DETECTED\n');
        console.log(`Seller Number: ${mismatch.sellerNumber}`);
        console.log(`Seller ID: ${mismatch.sellerId}`);
        console.log(`Property ID: ${mismatch.propertyId}`);
        console.log(`Database Value: "${mismatch.databaseValue}"`);
        console.log(`Spreadsheet Value: "${mismatch.spreadsheetValue}"`);
        console.log(`Severity: ${mismatch.severity}`);
        process.exit(1);
      } else {
        console.log('✅ No mismatch found');
        console.log(`Seller ${sellerNumber} property_type matches between database and spreadsheet`);
        process.exit(0);
      }
    } else {
      // Validate all sellers
      const report = await validator.validateAll();

      console.log('=== VALIDATION REPORT ===\n');
      console.log(`Timestamp: ${report.timestamp.toISOString()}`);
      console.log(`Total Sellers: ${report.totalSellers}`);
      console.log(`Total Checked: ${report.totalChecked}`);
      console.log(`Mismatches Found: ${report.mismatchCount}`);
      console.log(`Skipped: ${report.skipped.length}`);
      console.log(`Duration: ${report.duration}ms\n`);

      if (report.mismatchCount > 0) {
        console.log('=== MISMATCHES ===\n');
        
        // Group by severity
        const critical = report.mismatches.filter(m => m.severity === 'critical');
        const warning = report.mismatches.filter(m => m.severity === 'warning');
        const info = report.mismatches.filter(m => m.severity === 'info');

        if (critical.length > 0) {
          console.log(`🔴 CRITICAL (${critical.length}):`);
          critical.forEach(m => {
            console.log(`  ${m.sellerNumber}: DB="${m.databaseValue}" → Sheet="${m.spreadsheetValue}"`);
          });
          console.log('');
        }

        if (warning.length > 0) {
          console.log(`🟡 WARNING (${warning.length}):`);
          warning.forEach(m => {
            console.log(`  ${m.sellerNumber}: DB="${m.databaseValue}" → Sheet="${m.spreadsheetValue}"`);
          });
          console.log('');
        }

        if (info.length > 0) {
          console.log(`ℹ️  INFO (${info.length}):`);
          info.forEach(m => {
            console.log(`  ${m.sellerNumber}: DB="${m.databaseValue}" → Sheet="${m.spreadsheetValue}"`);
          });
          console.log('');
        }
      } else {
        console.log('✅ No mismatches found!\n');
      }

      if (report.skipped.length > 0) {
        console.log('=== SKIPPED ===\n');
        report.skipped.forEach(s => {
          console.log(`  ${s.sellerNumber}: ${s.reason}`);
        });
        console.log('');
      }

      // Save report to file
      const reportPath = path.join(__dirname, 'validation-report.json');
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`Report saved to: ${reportPath}\n`);

      if (report.mismatchCount > 0) {
        console.log('💡 To fix these mismatches, run: npx ts-node fix-property-types.ts');
        process.exit(1);
      } else {
        process.exit(0);
      }
    }
  } catch (error: any) {
    console.error('❌ Validation failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
