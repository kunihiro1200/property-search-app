import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAreaMappingTables() {
  console.log('=== エリアマッピングテーブル確認 ===\n');

  // 1. beppu_area_mapping テーブルを確認
  console.log('1. beppu_area_mapping テーブル:');
  try {
    const { data, error } = await supabase
      .from('beppu_area_mapping')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ エラー:', error.message);
      console.log('  ヒント:', error.hint);
    } else {
      console.log('  ✅ テーブルが存在します');
      console.log('  データ件数:', data?.length || 0);
    }
  } catch (error) {
    console.log('  ❌ 例外:', error);
  }

  // 2. area_map_config テーブルを確認
  console.log('\n2. area_map_config テーブル:');
  try {
    const { data, error } = await supabase
      .from('area_map_config')
      .select('*')
      .limit(5);
    
    if (error) {
      console.log('  ❌ エラー:', error.message);
    } else {
      console.log('  ✅ テーブルが存在します');
      console.log('  データ件数:', data?.length || 0);
      if (data && data.length > 0) {
        console.log('\n  サンプルデータ:');
        data.forEach((row, index) => {
          console.log(`  [${index + 1}]`, JSON.stringify(row, null, 2));
        });
      }
    }
  } catch (error) {
    console.log('  ❌ 例外:', error);
  }

  // 3. oita_city_area_mapping テーブルを確認
  console.log('\n3. oita_city_area_mapping テーブル:');
  try {
    const { data, error } = await supabase
      .from('oita_city_area_mapping')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log('  ❌ エラー:', error.message);
    } else {
      console.log('  ✅ テーブルが存在します');
      console.log('  データ件数:', data?.length || 0);
    }
  } catch (error) {
    console.log('  ❌ 例外:', error);
  }

  // 4. 全テーブル一覧を取得（PostgreSQL）
  console.log('\n4. 全テーブル一覧（area, beppu, oita を含むもの）:');
  try {
    const { data, error } = await supabase
      .rpc('get_table_names');
    
    if (error) {
      console.log('  ❌ RPCエラー:', error.message);
      console.log('  （この機能は利用できない可能性があります）');
    } else {
      console.log('  テーブル一覧:', data);
    }
  } catch (error) {
    console.log('  ❌ 例外（RPCが利用できません）');
  }
}

checkAreaMappingTables().catch(console.error);
