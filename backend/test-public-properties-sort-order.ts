import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPublicPropertiesSortOrder() {
  console.log('🔍 公開物件サイトのソート順を確認中...\n');

  // 公開物件サイトと同じクエリを実行
  const { data: properties, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, distribution_date, created_at')
    .order('distribution_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  console.log('📊 公開物件サイトの上位10件（全ての物件）:\n');
  properties.forEach((property, index) => {
    const isAA10804 = property.property_number === 'AA10804';
    const marker = isAA10804 ? '👉' : '  ';
    console.log(`${marker} ${index + 1}. ${property.property_number}`);
    console.log(`      - atbb_status: ${property.atbb_status}`);
    console.log(`      - distribution_date: ${property.distribution_date || 'NULL'}`);
    console.log(`      - created_at: ${property.created_at}`);
    console.log('');
  });

  // AA10804の順位を確認
  const aa10804Index = properties.findIndex(p => p.property_number === 'AA10804');
  if (aa10804Index !== -1) {
    console.log(`⚠️ AA10804は上位${aa10804Index + 1}番目に表示されています`);
    console.log(`   配信日: ${properties[aa10804Index].distribution_date}`);
    console.log(`   atbb_status: ${properties[aa10804Index].atbb_status}`);
  } else {
    console.log('✅ AA10804は上位10件に含まれていません');
  }
}

testPublicPropertiesSortOrder().catch(console.error);
