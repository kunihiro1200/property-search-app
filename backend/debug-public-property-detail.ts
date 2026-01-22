import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugPublicPropertyDetail() {
  console.log('=== 公開物件詳細のデバッグ ===\n');

  try {
    // 1. まず公開物件を1件取得
    console.log('1. 公開物件を1件取得...');
    const { data: publicProperties, error: listError } = await supabase
      .from('property_listings')
      .select('id, property_number, atbb_status')
      .eq('atbb_status', '専任・公開中')
      .limit(1);

    if (listError) {
      console.error('一覧取得エラー:', listError);
      return;
    }

    if (!publicProperties || publicProperties.length === 0) {
      console.log('公開物件が見つかりません');
      return;
    }

    const propertyId = publicProperties[0].id;
    console.log(`物件ID: ${propertyId}`);
    console.log(`物件番号: ${publicProperties[0].property_number}`);
    console.log(`ステータス: ${publicProperties[0].atbb_status}`);

    // 2. 詳細取得を試みる
    console.log('\n2. 詳細取得を試みる...');
    const { data: detail, error: detailError } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, address, price, land_area, building_area, construction_year_month, floor_plan, image_url, google_map_url, distribution_areas, atbb_status, remarks, created_at, updated_at')
      .eq('id', propertyId)
      .eq('atbb_status', '専任・公開中')
      .single();

    if (detailError) {
      console.error('詳細取得エラー:', detailError);
      console.error('エラーコード:', detailError.code);
      console.error('エラーメッセージ:', detailError.message);
      console.error('エラー詳細:', detailError.details);
      console.error('エラーヒント:', detailError.hint);
      return;
    }

    console.log('\n✅ 詳細取得成功:');
    console.log(JSON.stringify(detail, null, 2));

    // 3. テーブルのカラム一覧を確認
    console.log('\n3. property_listingsテーブルのカラム確認...');
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', { table_name: 'property_listings' });

    if (columnsError) {
      // RPCがない場合は別の方法で確認
      console.log('RPC使用不可、直接クエリで確認...');
      const { data: sampleRow, error: sampleError } = await supabase
        .from('property_listings')
        .select('*')
        .limit(1)
        .single();

      if (sampleError) {
        console.error('サンプル取得エラー:', sampleError);
      } else if (sampleRow) {
        console.log('利用可能なカラム:', Object.keys(sampleRow));
      }
    } else {
      console.log('カラム一覧:', columns);
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

debugPublicPropertyDetail();
