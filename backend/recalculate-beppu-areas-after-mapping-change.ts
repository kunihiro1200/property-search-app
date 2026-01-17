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

interface RecalculateStats {
  total: number;
  processed: number;
  updated: number;
  unchanged: number;
  errors: number;
  errorDetails: Array<{ propertyNumber: string; error: string }>;
}

/**
 * 特定の地域名を含む物件を取得
 */
async function getPropertiesByRegion(regionName: string) {
  console.log(`Fetching properties with region: ${regionName}...`);
  
  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, address, google_map_url, distribution_areas')
    .ilike('address', `%${regionName}%`)
    .order('property_number');
  
  if (error) {
    throw new Error(`Failed to fetch properties: ${error.message}`);
  }
  
  console.log(`Found ${data?.length || 0} properties`);
  return data || [];
}

/**
 * 配信エリアを再計算して更新
 */
async function recalculateAndUpdate(
  propertyNumber: string,
  address: string,
  googleMapUrl: string | null,
  currentDistributionAreas: string | null
): Promise<{ updated: boolean; newAreas: string | null; error?: string }> {
  try {
    // 市名を抽出
    const city = cityExtractor.extractCityFromAddress(address);
    
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

/**
 * 指定された地域名の物件の配信エリアを再計算
 */
async function recalculateForRegion(regionName: string, dryRun: boolean = false) {
  console.log('=== Recalculate Distribution Areas After Mapping Change ===\n');
  console.log(`Target region: ${regionName}\n`);
  
  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }
  
  const stats: RecalculateStats = {
    total: 0,
    processed: 0,
    updated: 0,
    unchanged: 0,
    errors: 0,
    errorDetails: []
  };
  
  try {
    // 1. 対象物件を取得
    const properties = await getPropertiesByRegion(regionName);
    stats.total = properties.length;
    
    if (stats.total === 0) {
      console.log('No properties found for this region');
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
          const city = cityExtractor.extractCityFromAddress(address);
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
            stats.unchanged++;
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
        const result = await recalculateAndUpdate(
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
            stats.unchanged++;
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
    }
    
  } catch (error: any) {
    console.error('Recalculation failed:', error.message);
    throw error;
  }
  
  return stats;
}

function printStats(stats: RecalculateStats, dryRun: boolean) {
  console.log('\n=== Recalculation Summary ===\n');
  console.log(`Total properties:     ${stats.total}`);
  console.log(`Processed:            ${stats.processed}`);
  console.log(`${dryRun ? 'Would update' : 'Updated'}:           ${stats.updated}`);
  console.log(`Unchanged:            ${stats.unchanged}`);
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
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: npx ts-node recalculate-beppu-areas-after-mapping-change.ts <region_name> [--dry-run|--force]');
    console.log('');
    console.log('Examples:');
    console.log('  npx ts-node recalculate-beppu-areas-after-mapping-change.ts "南立石一区" --dry-run');
    console.log('  npx ts-node recalculate-beppu-areas-after-mapping-change.ts "荘園" --force');
    console.log('');
    process.exit(0);
  }
  
  const regionName = args[0];
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const force = args.includes('--force') || args.includes('-f');
  
  if (!dryRun && !force) {
    console.log('This script will recalculate distribution areas for properties in the specified region.');
    console.log('Use --dry-run to preview changes without making updates.');
    console.log('Use --force to proceed with actual updates.');
    console.log('');
    process.exit(0);
  }
  
  try {
    const stats = await recalculateForRegion(regionName, dryRun);
    printStats(stats, dryRun);
    
    if (dryRun) {
      console.log('✅ Dry run completed successfully!');
      console.log('Run with --force to apply these changes.');
    } else {
      console.log('✅ Recalculation completed successfully!');
    }
  } catch (error) {
    console.error('❌ Recalculation failed:', error);
    process.exit(1);
  }
}

main();
