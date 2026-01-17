import { createClient } from '@supabase/supabase-js';
import { PropertyDistributionAreaCalculator } from './src/services/PropertyDistributionAreaCalculator';
import { CityNameExtractor } from './src/services/CityNameExtractor';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const distributionCalculator = new PropertyDistributionAreaCalculator();
const cityExtractor = new CityNameExtractor();

interface BackfillStats {
  total: number;
  processed: number;
  updated: number;
  skipped: number;
  errors: number;
  errorDetails: Array<{ propertyNumber: string; error: string }>;
}

async function getBeppuProperties() {
  console.log('Fetching Beppu City properties...');
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, distribution_areas')
    .ilike('address', '%別府市%')
    .order('property_number');
  
  if (error) {
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }
  
  console.log(`Found ${data?.length || 0} Beppu City properties`);
  return data || [];
}

async function updateDistributionAreas(
  propertyNumber: string,
  address: string,
  googleMapUrl: string | null,
  currentDistributionAreas: string | null
): Promise<{ updated: boolean; newAreas: string | null; error?: string }> {
  try {
    // 市名を抽出
    const city = cityExtractor.extractCityName(address);
    
    if (!city || !city.includes('別府')) {
      return {
        updated: false,
        newAreas: null,
        error: 'City is not Beppu'
      };
    }
    
    // 配信エリアを計算
    const result = await distributionCalculator.calculateDistributionAreas(
      googleMapUrl,
      city,
      address
    );
    
    const newAreas = result.formatted;
    
    // 既存の配信エリアと同じ場合はスキップ
    if (currentDistributionAreas === newAreas) {
      return {
        updated: false,
        newAreas,
        error: 'No change needed'
      };
    }
    
    // データベースを更新
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        distribution_areas: newAreas,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', propertyNumber);
    
    if (updateError) {
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    return {
      updated: true,
      newAreas
    };
  } catch (error: any) {
    return {
      updated: false,
      newAreas: null,
      error: error.message
    };
  }
}

async function backfillBeppuDistributionAreas(dryRun: boolean = false) {
  console.log('=== Beppu Distribution Areas Backfill ===\n');
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  const stats: BackfillStats = {
    total: 0,
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    // 1. 別府市の物件を取得
    const properties = await getBeppuProperties();
    stats.total = properties.length;
    
    if (stats.total === 0) {
      console.log('No Beppu City properties found');
      return stats;
    }
    
    console.log(`\nProcessing ${stats.total} properties...\n`);
    
    // 2. 各物件を処理
    for (const property of properties) {
      stats.processed++;
      
      const { property_number, address, google_map_url, distribution_areas } = property;
      
      console.log(`[${stats.processed}/${stats.total}] ${property_number}: ${address}`);
      
      if (dryRun) {
        // Dry runモードでは計算のみ
        try {
          const city = cityExtractor.extractCityName(address);
          const result = await distributionCalculator.calculateDistributionAreas(
            google_map_url,
            city,
            address
          );
          
          console.log(`  Current: ${distribution_areas || '(none)'}`);
          console.log(`  New:     ${result.formatted}`);
          
          if (distribution_areas !== result.formatted) {
            stats.updated++;
            console.log(`  ✓ Would update`);
          } else {
            stats.skipped++;
            console.log(`  - No change needed`);
          }
        } catch (error: any) {
          stats.errors++;
          stats.errorDetails.push({
            propertyNumber: property_number,
            error: error.message
          });
          console.log(`  ✗ Error: ${error.message}`);
        }
      } else {
        // 実際に更新
        const result = await updateDistributionAreas(
          property_number,
          address,
          google_map_url,
          distribution_areas
        );
        
        if (result.updated) {
          stats.updated++;
          console.log(`  ${distribution_areas || '(none)'} → ${result.newAreas}`);
          console.log(`  ✓ Updated`);
        } else if (result.error) {
          if (result.error === 'No change needed') {
            stats.skipped++;
            console.log(`  - Skipped: ${result.error}`);
          } else {
            stats.errors++;
            stats.errorDetails.push({
              propertyNumber: property_number,
              error: result.error
            });
            console.log(`  ✗ Error: ${result.error}`);
          }
        }
      }
      
      console.log('');
      
      // 進捗を定期的に表示
      if (stats.processed % 10 === 0) {
        console.log(`Progress: ${stats.processed}/${stats.total} (${Math.round(stats.processed / stats.total * 100)}%)\n`);
      }
    }
    
  } catch (error: any) {
    console.error('Backfill failed:', error.message);
    throw error;
  }
  
  return stats;
}

function printStats(stats: BackfillStats, dryRun: boolean) {
  console.log('\n=== Backfill Summary ===\n');
  console.log(`Total properties:     ${stats.total}`);
  console.log(`Processed:            ${stats.processed}`);
  console.log(`${dryRun ? 'Would update' : 'Updated'}:           ${stats.updated}`);
  console.log(`Skipped:              ${stats.skipped}`);
  console.log(`Errors:               ${stats.errors}`);
  
  if (stats.errorDetails.length > 0) {
    console.log('\nError Details:');
    stats.errorDetails.forEach(({ propertyNumber, error }) => {
      console.log(`  ${propertyNumber}: ${error}`);
    });
  }
  
  console.log('');
}

async function main() {
  // コマンドライン引数をチェック
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const force = args.includes('--force') || args.includes('-f');
  
  if (!dryRun && !force) {
    console.log('This script will update distribution areas for all Beppu City properties.');
    console.log('Use --dry-run to preview changes without making updates.');
    console.log('Use --force to proceed with actual updates.');
    console.log('');
    process.exit(0);
  }
  
  try {
    const stats = await backfillBeppuDistributionAreas(dryRun);
    printStats(stats, dryRun);
    
    if (dryRun) {
      console.log('✅ Dry run completed successfully!');
      console.log('Run with --force to apply these changes.');
    } else {
      console.log('✅ Backfill completed successfully!');
    }
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

main();
