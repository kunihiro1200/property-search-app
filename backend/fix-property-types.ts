import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { PropertyTypeValidationService } from './src/services/PropertyTypeValidationService';
import { SyncLogger } from './src/services/SyncLogger';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import readline from 'readline';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const sellerNumberArg = args.find(arg => arg.startsWith('--seller='));
  const sellerNumber = sellerNumberArg ? sellerNumberArg.split('=')[1] : null;

  console.log('=== Property Type Auto-Fix ===\n');

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  if (sellerNumber) {
    console.log(`Fixing seller: ${sellerNumber}\n`);
  } else {
    console.log('Fixing all sellers\n');
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
      // Fix single seller
      console.log('Checking for mismatch...\n');
      
      const mismatch = await validator.validateSeller(sellerNumber);

      if (!mismatch) {
        console.log('✅ No mismatch found');
        console.log(`Seller ${sellerNumber} property_type already matches`);
        process.exit(0);
      }

      console.log('Mismatch detected:');
      console.log(`  Database: "${mismatch.databaseValue}"`);
      console.log(`  Spreadsheet: "${mismatch.spreadsheetValue}"`);
      console.log(`  Severity: ${mismatch.severity}\n`);

      if (!dryRun) {
        const answer = await askQuestion('Apply fix? (yes/no): ');
        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Fix cancelled');
          process.exit(0);
        }
      }

      const fixed = await validator.autoFixSeller(sellerNumber, dryRun);

      if (fixed) {
        if (dryRun) {
          console.log('\n✅ Would fix this mismatch (dry-run mode)');
        } else {
          console.log('\n✅ Fixed successfully!');
          console.log(`Updated ${sellerNumber} property_type to: "${mismatch.spreadsheetValue}"`);
        }
        process.exit(0);
      } else {
        console.log('\n❌ Fix failed');
        process.exit(1);
      }
    } else {
      // Fix all sellers
      console.log('Running validation to find mismatches...\n');
      
      const report = await validator.validateAll();

      if (report.mismatchCount === 0) {
        console.log('✅ No mismatches found!');
        console.log('All property_type values are in sync');
        process.exit(0);
      }

      console.log(`Found ${report.mismatchCount} mismatches\n`);

      // Show summary
      const critical = report.mismatches.filter(m => m.severity === 'critical');
      const warning = report.mismatches.filter(m => m.severity === 'warning');
      const info = report.mismatches.filter(m => m.severity === 'info');

      console.log('Summary:');
      console.log(`  🔴 Critical: ${critical.length}`);
      console.log(`  🟡 Warning: ${warning.length}`);
      console.log(`  ℹ️  Info: ${info.length}\n`);

      if (!dryRun) {
        console.log('This will update the database to match the spreadsheet values.');
        const answer = await askQuestion(`Apply fixes to all ${report.mismatchCount} mismatches? (yes/no): `);
        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Fix cancelled');
          process.exit(0);
        }
        console.log('');
      }

      console.log('Applying fixes...\n');
      
      const result = await validator.autoFix(dryRun);

      console.log('=== FIX RESULT ===\n');
      console.log(`Timestamp: ${result.timestamp.toISOString()}`);
      console.log(`Total Fixed: ${result.totalFixed}`);
      console.log(`Errors: ${result.errors.length}`);
      console.log(`Duration: ${result.duration}ms\n`);

      if (result.totalFixed > 0) {
        console.log('=== FIXES APPLIED ===\n');
        result.fixes.forEach(fix => {
          console.log(`✅ ${fix.sellerNumber}: "${fix.oldValue}" → "${fix.newValue}"`);
        });
        console.log('');
      }

      if (result.errors.length > 0) {
        console.log('=== ERRORS ===\n');
        result.errors.forEach(err => {
          console.log(`❌ ${err.sellerNumber}: ${err.error}`);
        });
        console.log('');
      }

      // Save result to file
      const resultPath = path.join(__dirname, 'fix-result.json');
      fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
      console.log(`Result saved to: ${resultPath}\n`);

      if (dryRun) {
        console.log('💡 This was a dry-run. To apply fixes, run: npx ts-node fix-property-types.ts');
      } else {
        console.log('✅ All fixes applied successfully!');
      }

      process.exit(result.errors.length > 0 ? 1 : 0);
    }
  } catch (error: any) {
    console.error('❌ Fix failed:', error.message);
    if (error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
