import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを明示的に読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAA10804() {
  console.log('🔍 AA10804の配信日を確認中...\n');

  // 1. AA10804の情報を取得
  const { data: aa10804, error: aa10804Error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, distribution_date, created_at, updated_at')
    .eq('property_number', 'AA10804')
    .single();

  if (aa10804Error || !aa10804) {
    console.log('❌ AA10804が見つかりません');
    return;
  }

  console.log('📊 AA10804の情報:');
  console.log('   - property_number:', aa10804.property_number);
  console.log('   - atbb_status:', aa10804.atbb_status);
  console.log('   - distribution_date:', aa10804.distribution_date || 'NULL');
  console.log('   - created_at:', aa10804.created_at);
  console.log('   - updated_at:', aa10804.updated_at);
  console.log('');

  // 2. 2026年の配信日を持つ公開物件を取得
  const { data: properties2026, error: properties2026Error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, distribution_date')
    .in('atbb_status', ['公開中', '公開中（商談中）', '一般・公開前', '非公開（配信メールのみ）'])
    .gte('distribution_date', '2026-01-01')
    .order('distribution_date', { ascending: false });

  if (properties2026Error) {
    console.log('❌ 2026年の物件取得エラー:', properties2026Error.message);
    return;
  }

  console.log(`📊 2026年の配信日を持つ公開物件: ${properties2026.length}件`);
  console.log('');

  // 3. 公開物件サイトのソート順で上位10件を取得
  const { data: topProperties, error: topPropertiesError } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, distribution_date, created_at')
    .in('atbb_status', ['公開中', '公開中（商談中）', '一般・公開前', '非公開（配信メールのみ）'])
    .order('distribution_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(10);

  if (topPropertiesError) {
    console.log('❌ 上位物件取得エラー:', topPropertiesError.message);
    return;
  }

  console.log('📊 公開物件サイトの上位10件:');
  topProperties.forEach((property, index) => {
    const isAA10804 = property.property_number === 'AA10804';
    const marker = isAA10804 ? '👉' : '  ';
    console.log(`${marker} ${index + 1}. ${property.property_number}`);
    console.log(`      - atbb_status: ${property.atbb_status}`);
    console.log(`      - distribution_date: ${property.distribution_date || 'NULL'}`);
    console.log(`      - created_at: ${property.created_at}`);
    console.log('');
  });

  // 4. AA10804の順位を確認
  const aa10804Index = topProperties.findIndex(p => p.property_number === 'AA10804');
  if (aa10804Index !== -1) {
    console.log(`⚠️ AA10804は上位${aa10804Index + 1}番目に表示されています`);
    console.log('   配信日: 2025-08-09 なのに、2026年の物件より上位に表示されています');
  } else {
    console.log('✅ AA10804は上位10件に含まれていません');
  }
}

checkAA10804().catch(console.error);
