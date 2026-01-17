// CLI tool for syncing property_listings from sellers table
import { PropertyListingSyncService } from './src/services/PropertyListingSyncService';
import { DataIntegrityDiagnosticService } from './src/services/DataIntegrityDiagnosticService';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

dotenv.config();

// Create readline interface for user confirmation
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const syncService = new PropertyListingSyncService();
  const diagnosticService = new DataIntegrityDiagnosticService();

  try {
    switch (command) {
      case 'property': {
        // Sync a single property
        const propertyNumber = args[1];
        if (!propertyNumber) {
          console.error('Usage: ts-node sync-property-listings.ts property <property_number>');
          process.exit(1);
        }

        console.log(`\nSyncing property: ${propertyNumber}\n`);
        
        // First diagnose
        const diagnostic = await diagnosticService.diagnoseProperty(propertyNumber);
        console.log('=== Diagnostic ===');
        console.log(`Exists in property_listings: ${diagnostic.existsInPropertyListings ? '✓' : '✗'}`);
        console.log(`Exists in sellers: ${diagnostic.existsInSellers ? '✓' : '✗'}`);
        console.log(`Sync Status: ${diagnostic.syncStatus}\n`);

        if (diagnostic.existsInPropertyListings) {
          console.log('✓ Property listing already exists. No sync needed.\n');
          break;
        }

        if (!diagnostic.existsInSellers) {
          console.log('✗ No seller data found. Cannot sync.\n');
          break;
        }

        // Ask for confirmation
        const answer = await askQuestion('Do you want to create the property_listing? (yes/no): ');
        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Sync cancelled.\n');
          break;
        }

        // Perform sync
        const result = await syncService.syncFromSeller(propertyNumber);
        
        console.log('\n=== Sync Result ===');
        console.log(`Property Number: ${result.propertyNumber}`);
        console.log(`Success: ${result.success ? '✓' : '✗'}`);
        console.log(`Action: ${result.action}`);
        if (result.error) {
          console.log(`Error: ${result.error}`);
        }
        console.log('\n');
        break;
      }

      case 'batch': {
        // Sync multiple properties
        const propertyNumbers = args.slice(1);
        if (propertyNumbers.length === 0) {
          console.error('Usage: ts-node sync-property-listings.ts batch <property_number1> <property_number2> ...');
          process.exit(1);
        }

        console.log(`\nSyncing ${propertyNumbers.length} properties...\n`);
        
        // Ask for confirmation
        const answer = await askQuestion(`Do you want to sync ${propertyNumbers.length} properties? (yes/no): `);
        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Sync cancelled.\n');
          break;
        }

        const results = await syncService.syncBatch(propertyNumbers);
        
        console.log('\n=== Batch Sync Results ===\n');
        results.forEach(result => {
          const statusIcon = result.success ? '✓' : '✗';
          console.log(`${statusIcon} ${result.propertyNumber}: ${result.action}`);
          if (result.error) {
            console.log(`   Error: ${result.error}`);
          }
        });
        
        const summary = {
          created: results.filter(r => r.action === 'created').length,
          alreadyExists: results.filter(r => r.action === 'already_exists').length,
          failed: results.filter(r => r.action === 'failed').length,
          noSellerData: results.filter(r => r.action === 'no_seller_data').length,
        };
        
        console.log('\n--- Summary ---');
        console.log(`Created: ${summary.created}`);
        console.log(`Already exists: ${summary.alreadyExists}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`No seller data: ${summary.noSellerData}`);
        console.log('\n');
        break;
      }

      case 'all-missing': {
        // Sync all missing property_listings
        console.log('\nFinding all missing property_listings...\n');
        const missingPropertyNumbers = await diagnosticService.findAllMissingPropertyListings();
        
        if (missingPropertyNumbers.length === 0) {
          console.log('✓ No missing property_listings found.\n');
          break;
        }

        console.log(`Found ${missingPropertyNumbers.length} missing property_listings.\n`);
        console.log('Sample properties:');
        missingPropertyNumbers.slice(0, 10).forEach(pn => {
          console.log(`  - ${pn}`);
        });
        if (missingPropertyNumbers.length > 10) {
          console.log(`  ... and ${missingPropertyNumbers.length - 10} more`);
        }
        console.log('\n');

        // Ask for confirmation
        const answer = await askQuestion(`Do you want to sync all ${missingPropertyNumbers.length} missing property_listings? (yes/no): `);
        if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'y') {
          console.log('Sync cancelled.\n');
          break;
        }

        console.log('\nStarting sync...\n');
        const results = await syncService.syncAllMissing();
        
        console.log('\n=== Sync All Missing Results ===\n');
        
        const summary = {
          created: results.filter(r => r.action === 'created').length,
          alreadyExists: results.filter(r => r.action === 'already_exists').length,
          failed: results.filter(r => r.action === 'failed').length,
          noSellerData: results.filter(r => r.action === 'no_seller_data').length,
        };
        
        console.log('--- Summary ---');
        console.log(`Created: ${summary.created}`);
        console.log(`Already exists: ${summary.alreadyExists}`);
        console.log(`Failed: ${summary.failed}`);
        console.log(`No seller data: ${summary.noSellerData}`);
        
        if (summary.failed > 0) {
          console.log('\n--- Failed Properties ---');
          results.filter(r => r.action === 'failed').forEach(result => {
            console.log(`✗ ${result.propertyNumber}: ${result.error}`);
          });
        }
        
        console.log('\n');
        break;
      }

      default:
        console.log('Property Listing Sync Tool\n');
        console.log('Usage:');
        console.log('  ts-node sync-property-listings.ts property <property_number>');
        console.log('    - Sync a single property\n');
        console.log('  ts-node sync-property-listings.ts batch <property_number1> <property_number2> ...');
        console.log('    - Sync multiple properties\n');
        console.log('  ts-node sync-property-listings.ts all-missing');
        console.log('    - Sync all missing property_listings\n');
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    rl.close();
  }
}

main();
