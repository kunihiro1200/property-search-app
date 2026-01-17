import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

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
  notes?: string;
}

async function loadMappingData(): Promise<AreaMapping[]> {
  const dataPath = path.join(__dirname, 'beppu-area-mappings.json');
  
  if (!fs.existsSync(dataPath)) {
    console.error(`データファイルが見つかりません: ${dataPath}`);
    console.error('先に parse-beppu-area-data.ts を実行してください');
    process.exit(1);
  }
  
  const data = fs.readFileSync(dataPath, 'utf-8');
  return JSON.parse(data);
}

async function checkExistingData(): Promise<number> {
  const { data, error } = await supabase
    .from('beppu_area_mapping')
    .select('id', { count: 'exact', head: true });
  
  if (error) {
    console.error('既存データの確認に失敗:', error.message);
    return 0;
  }
  
  return data?.length || 0;
}

async function clearExistingData(): Promise<boolean> {
  console.log('既存データをクリアしています...');
  
  const { error } = await supabase
    .from('beppu_area_mapping')
    .delete()
    .neq('id', 0);
  
  if (error) {
    console.error('データクリアに失敗:', error.message);
    return false;
  }
  
  console.log('✓ 既存データをクリアしました');
  return true;
}

async function insertMappings(mappings: AreaMapping[], dryRun: boolean = false): Promise<boolean> {
  if (dryRun) {
    console.log('\n🔍 DRY RUN MODE - データベースへの書き込みはスキップします\n');
    console.log(`投入予定のレコード数: ${mappings.length}`);
    return true;
  }
  
  console.log(`\n${mappings.length}件のレコードを投入しています...`);
  
  const batchSize = 100;
  let inserted = 0;
  
  for (let i = 0; i < mappings.length; i += batchSize) {
    const batch = mappings.slice(i, i + batchSize);
    
    const { error } = await supabase
      .from('beppu_area_mapping')
      .insert(batch);
    
    if (error) {
      console.error(`バッチ ${Math.floor(i / batchSize) + 1} の投入に失敗:`, error.message);
      return false;
    }
    
    inserted += batch.length;
    console.log(`  ${inserted}/${mappings.length} 件投入完了`);
  }
  
  console.log('✓ 全データの投入が完了しました');
  return true;
}

async function verifyData(): Promise<void> {
  console.log('\nデータを検証しています...');
  
  // 学校区ごとのカウント
  const { data: allData, error } = await supabase
    .from('beppu_area_mapping')
    .select('school_district, region_name, distribution_areas');
  
  if (error) {
    console.error('検証に失敗:', error.message);
    return;
  }
  
  const bySchoolDistrict = new Map<string, number>();
  const byAreaCount = new Map<number, number>();
  
  allData?.forEach((row: any) => {
    // 学校区ごとのカウント
    const count = bySchoolDistrict.get(row.school_district) || 0;
    bySchoolDistrict.set(row.school_district, count + 1);
    
    // エリア数ごとのカウント
    const areaCount = row.distribution_areas.length;
    const areaCountStat = byAreaCount.get(areaCount) || 0;
    byAreaCount.set(areaCount, areaCountStat + 1);
  });
  
  console.log('\n=== データベース内のデータ統計 ===\n');
  
  console.log('学校区別の地域数:');
  for (const [district, count] of Array.from(bySchoolDistrict.entries()).sort()) {
    console.log(`  ${district}: ${count}地域`);
  }
  
  console.log('\n所属エリア数別の地域数:');
  for (const [areaCount, regionCount] of Array.from(byAreaCount.entries()).sort()) {
    console.log(`  ${areaCount}エリア: ${regionCount}地域`);
  }
  
  console.log(`\n合計: ${allData?.length || 0}地域`);
  
  // サンプルデータを表示
  console.log('\n=== サンプルデータ（最初の5件） ===\n');
  allData?.slice(0, 5).forEach((row: any, index: number) => {
    console.log(`${index + 1}. ${row.region_name}`);
    console.log(`   学校区: ${row.school_district}`);
    console.log(`   配信エリア: ${row.distribution_areas}`);
    console.log('');
  });
}

async function main() {
  console.log('=== 別府市エリアマッピングデータ投入 ===\n');
  
  // コマンドライン引数をチェック
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-d');
  const force = args.includes('--force') || args.includes('-f');
  
  if (!dryRun && !force) {
    console.log('このスクリプトは beppu_area_mapping テーブルのデータを更新します。');
    console.log('');
    console.log('オプション:');
    console.log('  --dry-run, -d  : データを投入せずに確認のみ');
    console.log('  --force, -f    : 実際にデータを投入');
    console.log('');
    process.exit(0);
  }
  
  try {
    // 1. データファイルを読み込み
    console.log('データファイルを読み込んでいます...');
    const mappings = await loadMappingData();
    console.log(`✓ ${mappings.length}件のマッピングデータを読み込みました\n`);
    
    // 2. 既存データを確認
    const existingCount = await checkExistingData();
    console.log(`現在のデータベース: ${existingCount}件のレコード\n`);
    
    if (!dryRun) {
      // 3. 既存データをクリア
      const cleared = await clearExistingData();
      if (!cleared) {
        console.error('❌ データクリアに失敗しました');
        process.exit(1);
      }
    }
    
    // 4. 新しいデータを投入
    const inserted = await insertMappings(mappings, dryRun);
    if (!inserted) {
      console.error('❌ データ投入に失敗しました');
      process.exit(1);
    }
    
    if (!dryRun) {
      // 5. データを検証
      await verifyData();
      
      console.log('\n✅ データ投入が完了しました！');
      console.log('\n次のステップ:');
      console.log('  1. backend/verify-beppu-area-mapping.ts を実行してマッピングをテスト');
      console.log('  2. backend/backfill-beppu-distribution-areas.ts を実行して既存物件を更新');
    } else {
      console.log('\n✅ Dry run完了！');
      console.log('実際にデータを投入するには --force オプションを使用してください');
    }
    
  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
