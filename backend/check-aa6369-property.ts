import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを明示的に読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProperty() {
  console.log('=== AA6369の物件データ確認 ===\n');

  // 売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA6369')
    .single();

  if (sellerError) {
    console.error('❌ 売主取得エラー:', sellerError);
    return;
  }

  console.log('✅ 売主情報:');
  console.log('  ID:', seller.id);
  console.log('  売主番号:', seller.seller_number);
  console.log('  名前:', seller.name);
  console.log('');

  // 物件情報を取得
  const { data: properties, error: propertyError } = await supabase
    .from('properties')
    .select('*')
    .eq('seller_id', seller.id);

  if (propertyError) {
    console.error('❌ 物件取得エラー:', propertyError);
    return;
  }

  console.log('📍 物件データ:');
  if (!properties || properties.length === 0) {
    console.log('  ⚠️  物件データが見つかりません');
  } else {
    console.log(`  ✅ ${properties.length}件の物件データが見つかりました`);
    properties.forEach((prop, index) => {
      console.log(`\n  物件 ${index + 1}:`);
      console.log('    ID:', prop.id);
      console.log('    住所:', prop.address);
      console.log('    種別:', prop.property_type);
      console.log('    土地面積:', prop.land_area);
      console.log('    建物面積:', prop.building_area);
      console.log('    築年:', prop.build_year);
      console.log('    間取り:', prop.floor_plan);
      console.log('    構造:', prop.structure);
      console.log('    状況:', prop.seller_situation);
    });
  }

  process.exit(0);
}

checkProperty().catch(console.error);
