import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function test() {
  console.log('=== 公開物件詳細APIテスト ===\n');

  // 公開物件を1件取得
  const { data: list, error: listError } = await supabase
    .from('property_listings')
    .select('id, property_number')
    .eq('atbb_status', '専任・公開中')
    .limit(1);
  
  if (listError) {
    console.log('一覧取得エラー:', listError);
    return;
  }

  if (!list || list.length === 0) {
    console.log('公開物件なし');
    return;
  }
  
  const id = list[0].id;
  console.log('物件ID:', id);
  console.log('物件番号:', list[0].property_number);
  
  // PropertyListingServiceと同じクエリを実行
  console.log('\n詳細取得テスト...');
  const { data, error } = await supabase
    .from('property_listings')
    .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, floor_plan, image_url, google_map_url, distribution_areas, atbb_status, special_notes, created_at, updated_at')
    .eq('id', id)
    .eq('atbb_status', '専任・公開中')
    .single();
  
  if (error) {
    console.log('エラー:', error);
  } else {
    console.log('成功:', data ? '取得OK' : 'データなし');
    if (data) {
      console.log('物件番号:', data.property_number);
      console.log('住所:', data.address);
    }
  }

  // テーブルのカラム確認
  console.log('\nテーブルカラム確認...');
  const { data: sample } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1)
    .single();
  
  if (sample) {
    console.log('利用可能なカラム:', Object.keys(sample).join(', '));
  }
}

test().catch(console.error);
