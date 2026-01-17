import * as dotenv from 'dotenv';
import * as path from 'path';
import { BuyerVerificationService } from './src/services/BuyerVerificationService';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

async function verifyBuyer6648() {
  console.log('🔍 Verifying Buyer 6648');
  console.log('='.repeat(50));

  try {
    const verificationService = new BuyerVerificationService();
    
    // Get buyer number from command line or default to 6648
    const buyerNumber = process.argv[2] || '6648';
    
    console.log(`\nVerifying buyer: ${buyerNumber}\n`);
    
    const result = await verificationService.verifyBuyer(buyerNumber);
    
    console.log('📊 Verification Results:');
    console.log('-'.repeat(50));
    console.log(`Buyer Number: ${result.buyerNumber}`);
    console.log(`Exists in Database: ${result.existsInDatabase ? '✅ Yes' : '❌ No'}`);
    console.log(`Exists in Spreadsheet: ${result.existsInSpreadsheet ? '✅ Yes' : '❌ No'}`);
    console.log(`Data Matches: ${result.dataMatches ? '✅ Yes' : '❌ No'}`);
    
    if (result.lastSyncedAt) {
      console.log(`Last Synced: ${new Date(result.lastSyncedAt).toLocaleString()}`);
    }
    
    if (result.mismatches.length > 0) {
      console.log('\n⚠️  Field Mismatches:');
      console.log('-'.repeat(50));
      
      for (const mismatch of result.mismatches) {
        console.log(`\nField: ${mismatch.field}`);
        console.log(`  Database:    ${JSON.stringify(mismatch.databaseValue)}`);
        console.log(`  Spreadsheet: ${JSON.stringify(mismatch.spreadsheetValue)}`);
      }
    }
    
    console.log('\n' + '='.repeat(50));
    
    if (!result.existsInDatabase) {
      console.log('❌ Buyer not found in database');
      console.log('💡 Run sync to add this buyer: npm run sync:buyers');
      process.exit(1);
    } else if (!result.existsInSpreadsheet) {
      console.log('⚠️  Buyer exists in database but not in spreadsheet');
      console.log('💡 This buyer may have been deleted from the spreadsheet');
    } else if (!result.dataMatches) {
      console.log('⚠️  Data mismatch detected');
      console.log('💡 Run sync to update: npm run sync:buyers');
      process.exit(1);
    } else {
      console.log('✅ Verification successful - data is consistent');
    }
    
  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyBuyer6648();
