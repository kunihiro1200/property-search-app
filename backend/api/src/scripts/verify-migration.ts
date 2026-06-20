import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const sheetsConfig = {
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
  sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
  // OAuth 2.0 credentials (優先)
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  // Service Account credentials (フォールバック)
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  privateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY,
};

interface VerificationResult {
  passed: boolean;
  message: string;
  details?: any;
}

async function verifyMigration(): Promise<void> {
  console.log('Starting migration verification...\n');

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const sheetsClient = new GoogleSheetsClient(sheetsConfig);

  const results: VerificationResult[] = [];

  try {
    // Google Sheets に接続
    await sheetsClient.authenticate();
    console.log('✓ Connected to Google Sheets\n');

    // 1. レコード数の確認
    console.log('1. Verifying record counts...');
    const sheetRows = await sheetsClient.readAll();
    const { count: supabaseCount, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      results.push({
        passed: false,
        message: 'Failed to count Supabase records',
        details: countError,
      });
    } else {
      const sheetCount = sheetRows.length;
      const passed = Math.abs(sheetCount - (supabaseCount || 0)) <= 10; // 10件以内の差は許容
      results.push({
        passed,
        message: `Record count comparison`,
        details: {
          spreadsheet: sheetCount,
          supabase: supabaseCount,
          difference: Math.abs(sheetCount - (supabaseCount || 0)),
        },
      });
    }

    // 2. 売主番号の重複チェック
    console.log('2. Checking for duplicate seller numbers...');
    const { data: duplicates, error: dupError } = await supabase.rpc('check_duplicate_seller_numbers');

    if (dupError) {
      results.push({
        passed: false,
        message: 'Failed to check duplicates',
        details: dupError,
      });
    } else {
      const hasDuplicates = duplicates && duplicates.length > 0;
      results.push({
        passed: !hasDuplicates,
        message: 'Duplicate seller numbers check',
        details: {
          duplicates: hasDuplicates ? duplicates : 'None',
        },
      });
    }

    // 3. 必須フィールドのチェック
    console.log('3. Checking required fields...');
    const { data: missingFields, error: fieldError } = await supabase
      .from('sellers')
      .select('id, seller_number, name')
      .or('seller_number.is.null,name.is.null');

    if (fieldError) {
      results.push({
        passed: false,
        message: 'Failed to check required fields',
        details: fieldError,
      });
    } else {
      const hasMissing = missingFields && missingFields.length > 0;
      results.push({
        passed: !hasMissing,
        message: 'Required fields check',
        details: {
          recordsWithMissingFields: hasMissing ? missingFields.length : 0,
        },
      });
    }

    // 4. サンプルデータの整合性チェック
    console.log('4. Verifying sample data consistency...');
    const sampleSize = Math.min(10, sheetRows.length);
    let consistentSamples = 0;

    for (let i = 0; i < sampleSize; i++) {
      const sheetRow = sheetRows[i];
      const sellerNumber = sheetRow['売主番号'];

      if (!sellerNumber) continue;

      const { data: seller, error } = await supabase
        .from('sellers')
        .select('*')
        .eq('seller_number', sellerNumber)
        .single();

      if (!error && seller) {
        // 名前が一致するかチェック
        if (seller.name === sheetRow['氏名']) {
          consistentSamples++;
        }
      }
    }

    results.push({
      passed: consistentSamples >= sampleSize * 0.9, // 90%以上一致すればOK
      message: 'Sample data consistency check',
      details: {
        samplesChecked: sampleSize,
        consistent: consistentSamples,
        percentage: Math.round((consistentSamples / sampleSize) * 100),
      },
    });

    // 5. 同期タイムスタンプのチェック
    console.log('5. Checking sync timestamps...');
    const { data: syncedRecords, error: syncError } = await supabase
      .from('sellers')
      .select('id')
      .not('synced_to_sheet_at', 'is', null);

    if (syncError) {
      results.push({
        passed: false,
        message: 'Failed to check sync timestamps',
        details: syncError,
      });
    } else {
      results.push({
        passed: true,
        message: 'Sync timestamps check',
        details: {
          recordsWithSyncTimestamp: syncedRecords?.length || 0,
        },
      });
    }

  } catch (error: any) {
    console.error('Verification error:', error);
    results.push({
      passed: false,
      message: 'Verification failed with error',
      details: error.message,
    });
  }

  // 結果を表示
  console.log('\n' + '='.repeat(60));
  console.log('VERIFICATION RESULTS');
  console.log('='.repeat(60) + '\n');

  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✓ PASS' : '✗ FAIL';
    const color = result.passed ? '\x1b[32m' : '\x1b[31m';
    console.log(`${color}${status}\x1b[0m ${result.message}`);
    
    if (result.details) {
      console.log('  Details:', JSON.stringify(result.details, null, 2));
    }
    console.log();

    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log('='.repeat(60));
  console.log(`Total: ${results.length} checks`);
  console.log(`\x1b[32mPassed: ${passedCount}\x1b[0m`);
  console.log(`\x1b[31mFailed: ${failedCount}\x1b[0m`);
  console.log('='.repeat(60) + '\n');

  if (failedCount === 0) {
    console.log('\x1b[32m✓ All verification checks passed!\x1b[0m');
    process.exit(0);
  } else {
    console.log('\x1b[31m✗ Some verification checks failed. Please review the details above.\x1b[0m');
    process.exit(1);
  }
}

// 重複チェック用のSQL関数を作成（存在しない場合）
async function createHelperFunctions() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION check_duplicate_seller_numbers()
    RETURNS TABLE (seller_number TEXT, count BIGINT) AS $$
    BEGIN
      RETURN QUERY
      SELECT s.seller_number, COUNT(*)::BIGINT
      FROM sellers s
      WHERE s.seller_number IS NOT NULL
      GROUP BY s.seller_number
      HAVING COUNT(*) > 1;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await supabase.rpc('exec_sql', { sql: createFunctionSQL });
  } catch (error) {
    // 関数が既に存在する場合はエラーを無視
  }
}

// メイン実行
(async () => {
  await createHelperFunctions();
  await verifyMigration();
})();
