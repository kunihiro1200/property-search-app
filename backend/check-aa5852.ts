// AA5852の配信エリアを確認
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: path.join(__dirname, '.env') });

async function checkAA5852() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('\n=== AA5852の配信エリア確認 ===\n');

  // DBから取得
  const { data: property, error } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA5852')
    .single();

  if (error) {
    console.error('エラー:', error.message);
    return;
  }

  if (!property) {
    console.log('AA5852が見つかりません');
    return;
  }

  console.log('売主番号:', property.seller_number);
  console.log('住所:', property.address);
  console.log('配信エリア:', property.distribution_areas);
  console.log('\n期待される配信エリア: ④, ㊵（常行は大分市）');
  
  // 配信エリアが正しいか確認
  const areas = property.distribution_areas || [];
  const hasArea4 = areas.includes('④');
  const hasArea35 = areas.includes('㊵');
  
  console.log('\n検証結果:');
  console.log(`  ④を含む: ${hasArea4 ? '✓' : '✗'}`);
  console.log(`  ㊵を含む: ${hasArea35 ? '✓' : '✗'}`);
  
  if (!hasArea4 || !hasArea35) {
    console.log('\n⚠️ 配信エリアが正しくありません！');
    console.log('常行は大分市なので、④と㊵が必要です。');
  } else {
    console.log('\n✓ 配信エリアは正しいです');
  }
}

checkAA5852().catch(console.error);
