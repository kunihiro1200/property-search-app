// 買主番号6432を直接検索
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer6432() {
  console.log('=== 買主番号6432を直接検索 ===\n');

  // 完全一致
  const { data: exact, error: error1 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6432');

  if (error1) console.error('Error1:', error1);
  console.log(`完全一致 (buyer_number = '6432'): ${exact?.length || 0}件`);
  if (exact && exact.length > 0) {
    exact.forEach(b => {
      console.log(`  ID: ${b.id}, 氏名: ${b.name}, property_number: ${b.property_number}`);
    });
  }

  // 部分一致
  const { data: partial, error: error2 } = await supabase
    .from('buyers')
    .select('*')
    .ilike('buyer_number', '%6432%');

  if (error2) console.error('Error2:', error2);
  console.log(`\n部分一致 (buyer_number LIKE '%6432%'): ${partial?.length || 0}件`);
  if (partial && partial.length > 0) {
    partial.forEach(b => {
      console.log(`  buyer_number: "${b.buyer_number}", 氏名: ${b.name}, property_number: ${b.property_number}`);
    });
  }

  // 買主番号が数値のみのものを検索
  const { data: numeric, error: error3 } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .gte('buyer_number', '6400')
    .lte('buyer_number', '6500')
    .order('buyer_number', { ascending: true });

  if (error3) console.error('Error3:', error3);
  console.log(`\n買主番号6400-6500の範囲: ${numeric?.length || 0}件`);
  if (numeric && numeric.length > 0) {
    numeric.slice(0, 20).forEach(b => {
      console.log(`  ${b.buyer_number} - ${b.name || '(名前なし)'} - property_number: ${b.property_number || '(未設定)'}`);
    });
  }

  // 高橋良子で検索
  const { data: byName, error: error4 } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .ilike('name', '%高橋良子%');

  if (error4) console.error('Error4:', error4);
  console.log(`\n氏名「高橋良子」で検索: ${byName?.length || 0}件`);
  if (byName && byName.length > 0) {
    byName.forEach(b => {
      console.log(`  ${b.buyer_number} - ${b.name} - property_number: ${b.property_number || '(未設定)'}`);
    });
  }
}

checkBuyer6432().then(() => {
  console.log('\n完了');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
