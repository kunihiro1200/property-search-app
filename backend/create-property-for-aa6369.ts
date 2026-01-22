import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function createProperty() {
  console.log('=== AA6369の物件データ作成 ===\n');

  // 売主情報を取得
  const { data: seller, error: sellerError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', 'AA6369')
    .single();

  if (sellerError || !seller) {
    console.error('❌ 売主が見つかりません:', sellerError);
    return;
  }

  console.log('✅ 売主情報取得:');
  console.log('  ID:', seller.id);
  console.log('  売主番号:', seller.seller_number);
  console.log('');

  // 物件データを作成
  const { data: property, error: propertyError } = await supabase
    .from('properties')
    .insert({
      seller_id: seller.id,
      address: '大分県大分市（住所不明）',
      prefecture: '大分県',
      city: '大分市',
      property_type: 'detached_house',
      land_area: null,
      building_area: null,
      build_year: null,
      structure: null,
      floor_plan: null,
      seller_situation: null,
      parking: null,
      additional_info: 'AA6360とダブり（不通で追客不要）のため詳細不明',
    })
    .select()
    .single();

  if (propertyError) {
    console.error('❌ 物件作成エラー:', propertyError);
    return;
  }

  console.log('✅ 物件データ作成成功:');
  console.log('  物件ID:', property.id);
  console.log('  住所:', property.address);
  console.log('  種別:', property.property_type);
  console.log('');
  console.log('✅ 完了！通話モードページで物件情報が表示されるようになりました。');

  process.exit(0);
}

createProperty().catch(console.error);
