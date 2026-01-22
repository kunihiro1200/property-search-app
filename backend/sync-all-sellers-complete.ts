import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { ColumnMapper } from './src/services/ColumnMapper';
import { PropertySyncHandler } from './src/services/PropertySyncHandler';
import { encrypt } from './src/utils/encryption';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SyncProgress {
  total: number;
  processed: number;
  updated: number;
  created: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{
    sellerNumber: string;
    error: string;
    timestamp: string;
  }>;
}

interface SyncOptions {
  batchSize?: number;
  skipProperties?: boolean;
  dryRun?: boolean;
  sellerNumbers?: string[];
}

async function syncAllSellersComplete(options: SyncOptions = {}) {
  const {
    batchSize = 100,
    skipProperties = false,
    dryRun = false,
    sellerNumbers = [],
  } = options;

  console.log('🔄 Starting comprehensive seller sync from spreadsheet...\n');
  
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No changes will be made to database\n');
  }

  const startTime = Date.now();

  const progress: SyncProgress = {
    total: 0,
    processed: 0,
    updated: 0,
    created: 0,
    skipped: 0,
    errors: 0,
    errorDetails: [],
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
    const propertySyncHandler = new PropertySyncHandler(supabase);

    // Get all rows from spreadsheet
    console.log('📊 Fetching data from spreadsheet...');
    let rows = await sheetsClient.readAll();
    console.log(`✅ Found ${rows.length} rows in spreadsheet\n`);

    // Filter by seller numbers if specified
    if (sellerNumbers.length > 0) {
      rows = rows.filter((row: any) => sellerNumbers.includes(row['売主番号']));
      console.log(`🔍 Filtered to ${rows.length} specific sellers\n`);
    }

    progress.total = rows.length;

    // Process in batches
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      try {
        const sellerNumber = row['売主番号'];
        if (!sellerNumber) {
          progress.skipped++;
          progress.processed++;
          continue;
        }

        // Map spreadsheet data to database format
        const mappedData = columnMapper.mapToDatabase(row);
        
        if (!dryRun) {
          // Check if seller exists
          const { data: existing } = await supabase
            .from('sellers')
            .select('id')
            .eq('seller_number', sellerNumber)
            .maybeSingle();

          if (existing) {
            // Update existing seller
            const { error } = await supabase
              .from('sellers')
              .update({
                name: mappedData.name ? encrypt(mappedData.name) : null,
                address: mappedData.address ? encrypt(mappedData.address) : null,
                phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
                email: mappedData.email ? encrypt(mappedData.email) : null,
                inquiry_site: mappedData.inquiry_site || null,
                inquiry_date: mappedData.inquiry_date || null,
                status: mappedData.status || null,
                confidence: mappedData.confidence || null,
                next_call_date: mappedData.next_call_date || null,
                contract_year_month: mappedData.contract_year_month || null,
                competitor_name: mappedData.competitor_name || null,
                competitor_name_and_reason: mappedData.competitor_name_and_reason || null,
                exclusive_other_decision_factor: mappedData.exclusive_other_decision_factor || null,
                valuation_amount_1: mappedData.valuation_amount_1 || null,
                valuation_amount_2: mappedData.valuation_amount_2 || null,
                valuation_amount_3: mappedData.valuation_amount_3 || null,
                visit_date: mappedData.visit_date || null,
                visit_time: mappedData.visit_time || null,
                visit_assignee: mappedData.visit_assignee || null,
                visit_notes: mappedData.visit_notes || null,
                valuation_assignee: mappedData.valuation_assignee || null,
                phone_assignee: mappedData.phone_assignee || null,
                comments: mappedData.comments || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existing.id);

            if (error) {
              throw new Error(`Update error: ${error.message}`);
            }

            progress.updated++;

            // Sync property if not skipped
            if (!skipProperties) {
              await propertySyncHandler.syncProperty(existing.id, {
                address: mappedData.property_address,
                property_type: mappedData.property_type,
                land_area: mappedData.land_area,
                building_area: mappedData.building_area,
                build_year: mappedData.build_year,
                structure: mappedData.structure,
                seller_situation: mappedData.seller_situation,
                floor_plan: mappedData.floor_plan,
                land_rights: mappedData.land_rights,
                current_status: mappedData.current_status,
              });
            }
          } else {
            // Create new seller
            const { data: newSeller, error } = await supabase
              .from('sellers')
              .insert({
                seller_number: sellerNumber,
                name: mappedData.name ? encrypt(mappedData.name) : null,
                address: mappedData.address ? encrypt(mappedData.address) : null,
                phone_number: mappedData.phone_number ? encrypt(mappedData.phone_number) : null,
                email: mappedData.email ? encrypt(mappedData.email) : null,
                inquiry_site: mappedData.inquiry_site || null,
                inquiry_date: mappedData.inquiry_date || null,
                status: mappedData.status || null,
                confidence: mappedData.confidence || null,
                next_call_date: mappedData.next_call_date || null,
                contract_year_month: mappedData.contract_year_month || null,
                competitor_name: mappedData.competitor_name || null,
                competitor_name_and_reason: mappedData.competitor_name_and_reason || null,
                exclusive_other_decision_factor: mappedData.exclusive_other_decision_factor || null,
                valuation_amount_1: mappedData.valuation_amount_1 || null,
                valuation_amount_2: mappedData.valuation_amount_2 || null,
                valuation_amount_3: mappedData.valuation_amount_3 || null,
                visit_date: mappedData.visit_date || null,
                visit_time: mappedData.visit_time || null,
                visit_assignee: mappedData.visit_assignee || null,
                visit_notes: mappedData.visit_notes || null,
                valuation_assignee: mappedData.valuation_assignee || null,
                phone_assignee: mappedData.phone_assignee || null,
                comments: mappedData.comments || null,
              })
              .select('id')
              .single();

            if (error) {
              throw new Error(`Create error: ${error.message}`);
            }

            progress.created++;

            // Sync property if not skipped
            if (!skipProperties && newSeller) {
              await propertySyncHandler.syncProperty(newSeller.id, {
                address: mappedData.property_address,
                property_type: mappedData.property_type,
                land_area: mappedData.land_area,
                building_area: mappedData.building_area,
                build_year: mappedData.build_year,
                structure: mappedData.structure,
                seller_situation: mappedData.seller_situation,
                floor_plan: mappedData.floor_plan,
                land_rights: mappedData.land_rights,
                current_status: mappedData.current_status,
              });
            }
          }
        }

        progress.processed++;

        // Progress reporting every 100 records
        if (progress.processed % batchSize === 0) {
          console.log(`  Processed ${progress.processed}/${progress.total} sellers...`);
        }

      } catch (error: any) {
        progress.errors++;
        progress.processed++;
        
        const sellerNumber = String(row['売主番号'] || 'unknown');
        progress.errorDetails.push({
          sellerNumber,
          error: error.message,
          timestamp: new Date().toISOString(),
        });

        console.error(`❌ Error processing ${sellerNumber}:`, error.message);
      }
    }

    // Final summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Sync completed!');
    console.log('='.repeat(60));
    console.log(`📊 Summary:`);
    console.log(`  - Total rows: ${progress.total}`);
    console.log(`  - Processed: ${progress.processed}`);
    console.log(`  - Updated: ${progress.updated}`);
    console.log(`  - Created: ${progress.created}`);
    console.log(`  - Skipped: ${progress.skipped}`);
    console.log(`  - Errors: ${progress.errors}`);
    console.log(`  - Duration: ${duration}s`);
    console.log('='.repeat(60));

    if (progress.errorDetails.length > 0) {
      console.log('\n❌ Error Details:');
      progress.errorDetails.forEach((err, idx) => {
        console.log(`  ${idx + 1}. ${err.sellerNumber}: ${err.error}`);
      });
    }

  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options: SyncOptions = {};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--dry-run') {
    options.dryRun = true;
  } else if (args[i] === '--skip-properties') {
    options.skipProperties = true;
  } else if (args[i] === '--batch-size' && args[i + 1]) {
    options.batchSize = parseInt(args[i + 1]);
    i++;
  } else if (args[i] === '--sellers' && args[i + 1]) {
    options.sellerNumbers = args[i + 1].split(',');
    i++;
  }
}

syncAllSellersComplete(options).catch(console.error);
