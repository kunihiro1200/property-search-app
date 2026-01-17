// CLI tool for diagnosing property data integrity
import { DataIntegrityDiagnosticService } from './src/services/DataIntegrityDiagnosticService';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const diagnosticService = new DataIntegrityDiagnosticService();

  try {
    switch (command) {
      case 'property': {
        // Diagnose a single property
        const propertyNumber = args[1];
        if (!propertyNumber) {
          console.error('Usage: ts-node diagnose-property-integrity.ts property <property_number>');
          process.exit(1);
        }

        console.log(`\nDiagnosing property: ${propertyNumber}\n`);
        const result = await diagnosticService.diagnoseProperty(propertyNumber);
        
        console.log('=== Diagnostic Result ===');
        console.log(`Property Number: ${result.propertyNumber}`);
        console.log(`Exists in property_listings: ${result.existsInPropertyListings ? '✓' : '✗'}`);
        console.log(`Exists in sellers: ${result.existsInSellers ? '✓' : '✗'}`);
        console.log(`Sync Status: ${result.syncStatus}`);
        
        if (result.sellerData) {
          console.log('\n--- Seller Data ---');
          console.log(`Seller Number: ${result.sellerData.seller_number}`);
          console.log(`Address: ${result.sellerData.address || 'N/A'}`);
          console.log(`City: ${result.sellerData.city || 'N/A'}`);
          console.log(`Price: ${result.sellerData.price || 'N/A'}`);
          console.log(`Property Type: ${result.sellerData.property_type || 'N/A'}`);
        }
        
        if (result.propertyListingData) {
          console.log('\n--- Property Listing Data ---');
          console.log(`Address: ${result.propertyListingData.address || 'N/A'}`);
          console.log(`City: ${result.propertyListingData.city || 'N/A'}`);
          console.log(`Price: ${result.propertyListingData.price || 'N/A'}`);
          console.log(`Property Type: ${result.propertyListingData.property_type || 'N/A'}`);
        }
        
        console.log('\n');
        break;
      }

      case 'batch': {
        // Diagnose multiple properties
        const propertyNumbers = args.slice(1);
        if (propertyNumbers.length === 0) {
          console.error('Usage: ts-node diagnose-property-integrity.ts batch <property_number1> <property_number2> ...');
          process.exit(1);
        }

        console.log(`\nDiagnosing ${propertyNumbers.length} properties...\n`);
        const results = await diagnosticService.diagnoseBatch(propertyNumbers);
        
        console.log('=== Batch Diagnostic Results ===\n');
        results.forEach(result => {
          const statusIcon = result.syncStatus === 'synced' ? '✓' : 
                           result.syncStatus === 'missing_property_listing' ? '⚠' : '✗';
          console.log(`${statusIcon} ${result.propertyNumber}: ${result.syncStatus}`);
        });
        
        const summary = {
          synced: results.filter(r => r.syncStatus === 'synced').length,
          missingPropertyListing: results.filter(r => r.syncStatus === 'missing_property_listing').length,
          missingSeller: results.filter(r => r.syncStatus === 'missing_seller').length,
          notFound: results.filter(r => r.syncStatus === 'not_found').length,
        };
        
        console.log('\n--- Summary ---');
        console.log(`Synced: ${summary.synced}`);
        console.log(`Missing property_listing: ${summary.missingPropertyListing}`);
        console.log(`Missing seller: ${summary.missingSeller}`);
        console.log(`Not found: ${summary.notFound}`);
        console.log('\n');
        break;
      }

      case 'find-missing': {
        // Find all missing property_listings
        console.log('\nFinding all missing property_listings...\n');
        const missingPropertyNumbers = await diagnosticService.findAllMissingPropertyListings();
        
        console.log('=== Missing Property Listings ===\n');
        if (missingPropertyNumbers.length === 0) {
          console.log('✓ No missing property_listings found. All sellers have corresponding property_listings.');
        } else {
          console.log(`Found ${missingPropertyNumbers.length} properties missing from property_listings:\n`);
          missingPropertyNumbers.forEach(pn => {
            console.log(`  - ${pn}`);
          });
        }
        console.log('\n');
        break;
      }

      case 'stats': {
        // Get summary statistics
        console.log('\nGathering data integrity statistics...\n');
        const stats = await diagnosticService.getSummaryStats();
        
        console.log('=== Data Integrity Statistics ===\n');
        console.log(`Total Sellers (with property_number): ${stats.totalSellers}`);
        console.log(`Total Property Listings: ${stats.totalPropertyListings}`);
        console.log(`Synced: ${stats.synced}`);
        console.log(`Missing property_listings: ${stats.missingPropertyListings}`);
        console.log(`Missing seller records: ${stats.missingSellerRecords}`);
        
        const syncPercentage = stats.totalSellers > 0 
          ? ((stats.synced / stats.totalSellers) * 100).toFixed(2)
          : '0.00';
        console.log(`\nSync Rate: ${syncPercentage}%`);
        console.log('\n');
        break;
      }

      default:
        console.log('Property Data Integrity Diagnostic Tool\n');
        console.log('Usage:');
        console.log('  ts-node diagnose-property-integrity.ts property <property_number>');
        console.log('    - Diagnose a single property\n');
        console.log('  ts-node diagnose-property-integrity.ts batch <property_number1> <property_number2> ...');
        console.log('    - Diagnose multiple properties\n');
        console.log('  ts-node diagnose-property-integrity.ts find-missing');
        console.log('    - Find all properties missing from property_listings\n');
        console.log('  ts-node diagnose-property-integrity.ts stats');
        console.log('    - Show data integrity statistics\n');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
