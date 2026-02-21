import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA4393() {
  console.log('=== AA4393の確認 ===\n');

  // 1. 買主テーブルで検索
  console.log('1. 買主テーブルで検索:');
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .eq('buyer_number', 'AA4393')
    .single();

  if (buyerError) {
    console.log('   買主テーブルにAA4393は存在しません');
  } else {
    console.log('   ✅ 買主テーブルにAA4393が存在します');
    console.log('   買主番号:', buyer.buyer_number);
    console.log('   氏名:', buyer.name);
    console.log('   問い合わせ物件番号:', buyer.property_number);
  }

  // 2. 物件テーブルで検索
  console.log('\n2. 物件テーブルで検索:');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, address, property_type')
    .eq('property_number', 'AA4393')
    .single();

  if (propertyError) {
    console.log('   物件テーブルにAA4393は存在しません');
  } else {
    console.log('   ✅ 物件テーブルにAA4393が存在します');
    console.log('   物件番号:', property.property_number);
    console.log('   住所:', property.address);
    console.log('   種別:', property.property_type);
  }

  // 3. 結論
  console.log('\n=== 結論 ===');
  if (buyer && !property) {
    console.log('AA4393は買主番号です');
  } else if (!buyer && property) {
    console.log('AA4393は物件番号です');
  } else if (buyer && property) {
    console.log('AA4393は買主番号と物件番号の両方に存在します（重複）');
  } else {
    console.log('AA4393はどちらにも存在しません');
  }
}

checkAA4393().catch(console.error);
