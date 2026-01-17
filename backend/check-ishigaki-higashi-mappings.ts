import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkIshigakiHigashiMappings() {
  console.log('=== 石垣東のマッピングデータ確認 ===\n');
  
  // 石垣東関連のマッピングを全て取得
  const { data: mappings, error } = await supabase
    .from('beppu_area_mapping')
    .select('*')
    .ilike('region_name', '%石垣東%')
    .order('region_name');
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }
  
  console.log('【石垣東のマッピング一覧】');
  if (mappings && mappings.length > 0) {
    mappings.forEach((m: any) => {
      console.log(`${m.region_name.padEnd(15)} : ${m.distribution_areas.padEnd(10)} (${m.school_district || 'N/A'})`);
    });
  } else {
    console.log('マッピングが見つかりません');
  }
  
  console.log('\n【AA12710とAA12766の比較】');
  console.log('AA12710: 別府市石垣東７丁目1-19 → 期待値: ⑭㊶');
  console.log('AA12766: 別府市石垣東７丁目１−１９ → 期待値: ⑩⑭㊶㊸');
  
  console.log('\n【問題】');
  console.log('同じ「石垣東7丁目」の住所なのに、異なる配信エリアが期待されています。');
  console.log('これは以下のいずれかを意味します：');
  console.log('1. 部屋番号や建物名によって配信エリアが異なる（通常はありえない）');
  console.log('2. 期待値が間違っている');
  console.log('3. データベースのマッピングが不完全');
}

checkIshigakiHigashiMappings().catch(console.error);
