import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { decrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface VerificationResult {
  totalChecked: number;
  passed: number;
  failed: number;
  issues: Array<{
    sellerNumber: string;
    field: string;
    expected: any;
    actual: any;
  }>;
}

async function verifyAllSellersSync(
  sampleSize: number = 10,
  sellerNumbers: string[] = []
): Promise<VerificationResult> {
  console.log('🔍 Starting seller sync verification...\n');

  const result: VerificationResult = {
    totalChecked: 0,
    passed: 0,
    failed: 0,
    issues: [],
  };

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

    // Get all rows from spreadsheet
    console.log('📊 Fetching data from spreadsheet...');
    let rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows in spreadsheet\n`);

    // Filter or sample
    if (sellerNumbers.length > 0) {
      rows = rows.filter((row: any) => sellerNumbers.includes(row['売主番号']));
      console.log(`🔍 Checking ${rows.length} specific sellers\n`);
    } else {
      // Random sample
      rows = rows
        .filter((row: any) => row['売主番号'])
        .sort(() => Math.random() - 0.5)
        .slice(0, sampleSize);
      console.log(`🎲 Checking random sample of ${rows.length} sellers\n`);
    }

    result.totalChecked = rows.length;

    // Verify each seller
    for (const row of rows) {
      const sellerNumber = String(row['売主番号']);
      if (!sellerNumber) continue;

      console.log(`Checking ${sellerNumber}...`);

      try {
        // Get from database
        const { data: dbSeller, error } = await supabase
          .from('sellers')
          .select('*')
          .eq('seller_number', sellerNumber)
          .maybeSingle();

        if (error || !dbSeller) {
          result.failed++;
          result.issues.push({
            sellerNumber,
            field: 'existence',
            expected: 'exists',
            actual: 'not found',
          });
          continue;
        }

        // Map spreadsheet data
        const mappedData = columnMapper.mapToDatabase(row);

        // Compare key fields
        const fieldsToCheck = [
          { field: 'name', encrypted: true },
          { field: 'address', encrypted: true },
          { field: 'phone_number', encrypted: true },
          { field: 'email', encrypted: true },
          { field: 'status', encrypted: false },
          { field: 'confidence', encrypted: false },
          { field: 'valuation_amount_1', encrypted: false },
          { field: 'valuation_amount_2', encrypted: false },
          { field: 'valuation_amount_3', encrypted: false },
          { field: 'comments', encrypted: false },
          { field: 'visit_date', encrypted: false },
          { field: 'visit_time', encrypted: false },
          { field: 'visit_assignee', encrypted: false },
        ];

        let hasIssues = false;

        for (const { field, encrypted } of fieldsToCheck) {
          const expected = (mappedData as any)[field];
          let actual = (dbSeller as any)[field];

          // Decrypt if needed
          if (encrypted && actual) {
            try {
              actual = decrypt(actual);
            } catch (e) {
              // Decryption failed
              actual = '[DECRYPTION_FAILED]';
            }
          }

          // Normalize for comparison
          const normalizedExpected = normalizeValue(expected);
          const normalizedActual = normalizeValue(actual);

          if (normalizedExpected !== normalizedActual) {
            hasIssues = true;
            result.issues.push({
              sellerNumber,
              field,
              expected: normalizedExpected,
              actual: normalizedActual,
            });
          }
        }

        if (hasIssues) {
          result.failed++;
        } else {
          result.passed++;
        }

      } catch (error: any) {
        result.failed++;
        result.issues.push({
          sellerNumber,
          field: 'verification',
          expected: 'success',
          actual: `error: ${error.message}`,
        });
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('✅ Verification completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`  - Total checked: ${result.totalChecked}`);
    console.log(`  - Passed: ${result.passed}`);
    console.log(`  - Failed: ${result.failed}`);
    console.log('='.repeat(60));

    if (result.issues.length > 0) {
      console.log('\n⚠️  Issues found:');
      const groupedIssues: Record<string, typeof result.issues> = {};
      
      result.issues.forEach(issue => {
        if (!groupedIssues[issue.sellerNumber]) {
          groupedIssues[issue.sellerNumber] = [];
        }
        groupedIssues[issue.sellerNumber].push(issue);
      });

      Object.entries(groupedIssues).forEach(([sellerNumber, issues]) => {
        console.log(`\n  ${sellerNumber}:`);
        issues.forEach(issue => {
          console.log(`    - ${issue.field}:`);
          console.log(`      Expected: ${issue.expected}`);
          console.log(`      Actual: ${issue.actual}`);
        });
      });
    }

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }

  return result;
}

function normalizeValue(value: any): string {
  if (value === null || value === undefined || value === '') {
    return 'null';
  }
  return String(value).trim();
}

// Parse command line arguments
const args = process.argv.slice(2);
let sampleSize = 10;
let sellerNumbers: string[] = [];

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--sample-size' && args[i + 1]) {
    sampleSize = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--sellers' && args[i + 1]) {
    sellerNumbers = args[i + 1].split(',');
    i++;
  }
}

verifyAllSellersSync(sampleSize, sellerNumbers).catch(console.error);
