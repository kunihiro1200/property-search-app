// テスト用の公開物件データを作成
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function createTestProperty() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== テスト用の公開物件データを作成 ===\n');

  try {
    // site_displayカラムが存在するか確認
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('site_display')
      .limit(1);

    if (checkError) {
      console.error('❌ site_displayカラムが存在しません');
      console.log('\n以下のマイグレーションを実行してください:');
      console.log('backend/migrations/073_add_site_display_column.sql');
      return;
    }

    // テスト用物件を作成
    const testProperty = {
      property_number: `TEST-PUBLIC-${Date.now()}`,
      property_type: '戸建て',
      address: '大分県別府市北浜1-1-1',
      display_address: '別府市北浜',
      price: 25000000,
      land_area: 150.50,
      building_area: 95.30,
      construction_year_month: '2020年3月',
      floor_plan: '3LDK',
      google_map_url: 'https://maps.google.com/?q=33.2815,131.4916',
      distribution_areas: ['1', '2', '3'],
      remarks: 'テスト用の公開物件です。海が近く、温泉も楽しめます。',
      site_display: 'サイト表示', // 公開設定
      status: '専任両手',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('property_listings')
      .insert(testProperty)
      .select()
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    console.log('✅ テスト用公開物件を作成しました');
    console.log(`  - ID: ${data.id}`);
    console.log(`  - 物件番号: ${data.property_number}`);
    console.log(`  - 住所: ${data.address}`);
    console.log(`  - 価格: ${data.price?.toLocaleString()}円`);
    console.log(`  - サイト表示: ${data.site_display}`);

    console.log('\n次のコマンドでテストを実行できます:');
    console.log('npx ts-node test-public-property-detail.ts');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

createTestProperty();
