import * as dotenv from 'dotenv';
import { DataConsistencyChecker } from './src/services/DataConsistencyChecker';

// Load environment variables
dotenv.config();

async function main() {
  console.log('=== Buyer #6666 Consistency Check ===\n');

  const checker = new DataConsistencyChecker();

  try {
    // Check buyer #6666 specifically
    const result = await checker.verifyBuyer('6666');

    if (!result) {
      console.log('✅ Buyer #6666 not found or no inconsistencies detected');
      return;
    }

    console.log(`\n❌ Found ${result.inconsistencies.length} inconsistencies for buyer #6666:\n`);

    for (const inconsistency of result.inconsistencies) {
      console.log(`Field: ${inconsistency.fieldName}`);
      console.log(`  Spreadsheet: "${inconsistency.spreadsheetValue}"`);
      console.log(`  Database:    "${inconsistency.databaseValue}"`);
      console.log('');
    }

    // Focus on the specific fields we're concerned about
    const targetFields = ['viewing_result_follow_up', 'follow_up_assignee'];
    const targetInconsistencies = result.inconsistencies.filter(
      inc => targetFields.includes(inc.fieldName)
    );

    if (targetInconsistencies.length > 0) {
      console.log('\n🎯 Target field inconsistencies:');
      for (const inc of targetInconsistencies) {
        console.log(`  - ${inc.fieldName}: Spreadsheet="${inc.spreadsheetValue}" vs DB="${inc.databaseValue}"`);
      }
    } else {
      console.log('\n✅ Target fields (viewing_result_follow_up, follow_up_assignee) are consistent');
    }

  } catch (err) {
    console.error('Error checking buyer #6666:', err);
    process.exit(1);
  }
}

main();
