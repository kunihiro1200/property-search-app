import { createClient } from '@supabase/supabase-js';
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

interface AreaMapping {
  school_district: string;
  region_name: string;
  distribution_areas: string;
  other_region?: string;
}

/**
 * 新しい地域マッピングを追加
 */
async function addMapping(mapping: AreaMapping) {
  console.log(`Adding mapping: ${mapping.region_name} → ${mapping.distribution_areas}`);
  
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .insert([mapping])
    .select()
    .single();
  
  if (error) {
    console.error('Error adding mapping:', error.message);
    return null;
  }
  
  console.log('✓ Mapping added successfully');
  return data;
}

/**
 * 既存の地域マッピングを更新
 */
async function updateMapping(regionName: string, updates: Partial<AreaMapping>) {
  console.log(`Updating mapping for: ${regionName}`);
  
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('region_name', regionName)
    .select();
  
  if (error) {
    console.error('Error updating mapping:', error.message);
    return null;
  }
  
  if (!data || data.length === 0) {
    console.error(`No mapping found for region: ${regionName}`);
    return null;
  }
  
  console.log(`✓ Updated ${data.length} mapping(s)`);
  return data;
}

/**
 * 地域マッピングを削除
 */
async function deleteMapping(regionName: string) {
  console.log(`Deleting mapping for: ${regionName}`);
  
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .delete()
    .eq('region_name', regionName)
    .select();
  
  if (error) {
    console.error('Error deleting mapping:', error.message);
    return false;
  }
  
  if (!data || data.length === 0) {
    console.error(`No mapping found for region: ${regionName}`);
    return false;
  }
  
  console.log(`✓ Deleted ${data.length} mapping(s)`);
  return true;
}

/**
 * 地域マッピングを検索
 */
async function searchMapping(regionName: string) {
  console.log(`Searching for: ${regionName}`);
  
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .ilike('region_name', `%${regionName}%`);
  
  if (error) {
    console.error('Error searching mappings:', error.message);
    return [];
  }
  
  if (!data || data.length === 0) {
    console.log('No mappings found');
    return [];
  }
  
  console.log(`Found ${data.length} mapping(s):`);
  data.forEach((mapping: any) => {
    console.log(`  ${mapping.school_district} - ${mapping.region_name} → ${mapping.distribution_areas}`);
  });
  
  return data;
}

/**
 * 学校区ごとのマッピングを表示
 */
async function listBySchoolDistrict(schoolDistrict?: string) {
  let query = supabase
    .from('beppu_area_mapping')
    .select('*')
    .order('school_district')
    .order('region_name');
  
  if (schoolDistrict) {
    query = query.eq('school_district', schoolDistrict);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error listing mappings:', error.message);
    return;
  }
  
  if (!data || data.length === 0) {
    console.log('No mappings found');
    return;
  }
  
  console.log(`\nTotal mappings: ${data.length}\n`);
  
  let currentDistrict = '';
  data.forEach((mapping: any) => {
    if (mapping.school_district !== currentDistrict) {
      currentDistrict = mapping.school_district;
      console.log(`\n${currentDistrict}:`);
    }
    console.log(`  ${mapping.region_name} → ${mapping.distribution_areas}${mapping.other_region ? ` (${mapping.other_region})` : ''}`);
  });
}

/**
 * 使用方法を表示
 */
function printUsage() {
  console.log(`
Usage: npx ts-node manage-beppu-area-mapping.ts <command> [options]

Commands:
  add <school_district> <region_name> <distribution_areas> [other_region]
    Add a new area mapping
    Example: npx ts-node manage-beppu-area-mapping.ts add "青山中学校" "新地域" "⑨㊷" "別府駅周辺"

  update <region_name> <field> <value>
    Update an existing mapping
    Example: npx ts-node manage-beppu-area-mapping.ts update "南立石一区" distribution_areas "⑨㊷㊸"

  delete <region_name>
    Delete a mapping
    Example: npx ts-node manage-beppu-area-mapping.ts delete "旧地域"

  search <region_name>
    Search for mappings by region name
    Example: npx ts-node manage-beppu-area-mapping.ts search "荘園"

  list [school_district]
    List all mappings, optionally filtered by school district
    Example: npx ts-node manage-beppu-area-mapping.ts list
    Example: npx ts-node manage-beppu-area-mapping.ts list "青山中学校"
  `);
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }
  
  const command = args[0];
  
  try {
    switch (command) {
      case 'add':
        if (args.length < 4) {
          console.error('Error: add command requires school_district, region_name, and distribution_areas');
          printUsage();
          process.exit(1);
        }
        await addMapping({
          school_district: args[1],
          region_name: args[2],
          distribution_areas: args[3],
          other_region: args[4]
        });
        break;
      
      case 'update':
        if (args.length < 4) {
          console.error('Error: update command requires region_name, field, and value');
          printUsage();
          process.exit(1);
        }
        await updateMapping(args[1], { [args[2]]: args[3] } as any);
        break;
      
      case 'delete':
        if (args.length < 2) {
          console.error('Error: delete command requires region_name');
          printUsage();
          process.exit(1);
        }
        await deleteMapping(args[1]);
        break;
      
      case 'search':
        if (args.length < 2) {
          console.error('Error: search command requires region_name');
          printUsage();
          process.exit(1);
        }
        await searchMapping(args[1]);
        break;
      
      case 'list':
        await listBySchoolDistrict(args[1]);
        break;
      
      default:
        console.error(`Unknown command: ${command}`);
        printUsage();
        process.exit(1);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
