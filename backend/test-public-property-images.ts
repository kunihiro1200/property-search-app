import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testPublicPropertyImages() {
  console.log('=== 公開物件画像APIテスト ===\n');

  // 1. 物件IDを取得
  console.log('1. 公開物件を取得...');
  const { data: properties, error: propError } = await supabase
    .from('property_listings')
    .select('id, property_number, atbb_status')
    .limit(5);

  if (propError || !properties || properties.length === 0) {
    console.error('物件取得エラー:', propError);
    return;
  }

  console.log(`取得した物件数: ${properties.length}`);
  properties.forEach(p => {
    console.log(`  - ${p.property_number}: ${p.atbb_status}`);
  });

  const property = properties[0];
  console.log(`\nテスト対象物件ID: ${property.id}`);
  console.log(`物件番号: ${property.property_number}\n`);

  // 2. work_tasksからstorage_urlを取得
  console.log('2. work_tasksからstorage_urlを取得...');
  const { data: workTask, error: workError } = await supabase
    .from('work_tasks')
    .select('storage_url')
    .eq('property_number', property.property_number)
    .single();

  if (workError) {
    console.error('work_tasks取得エラー:', workError);
  } else {
    console.log(`storage_url: ${workTask?.storage_url || 'なし'}\n`);
  }

  // 3. hidden_imagesカラムを取得
  console.log('3. hidden_imagesカラムを取得...');
  const { data: hiddenData, error: hiddenError } = await supabase
    .from('property_listings')
    .select('hidden_images')
    .eq('id', property.id)
    .single();

  if (hiddenError) {
    console.error('❌ hidden_images取得エラー:', hiddenError.message);
    console.error('エラーコード:', hiddenError.code);
    console.error('エラー詳細:', hiddenError.details);
    console.error('エラーヒント:', hiddenError.hint);
  } else {
    console.log('✅ hidden_images:', hiddenData?.hidden_images || []);
  }

  // 4. property_listingsテーブルのカラム一覧を確認
  console.log('\n4. property_listingsテーブルのカラム一覧を確認...');
  const { data: columns, error: colError } = await supabase
    .rpc('get_table_columns', { table_name: 'property_listings' });

  if (colError) {
    console.error('カラム取得エラー（RPCが存在しない可能性）:', colError.message);
    
    // 代替方法：実際にデータを取得してカラムを確認
    const { data: sampleData, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1)
      .single();
    
    if (!sampleError && sampleData) {
      const columnNames = Object.keys(sampleData);
      console.log(`property_listingsのカラム: ${JSON.stringify(columnNames)}`);
      console.log(`hidden_imagesカラムが存在: ${columnNames.includes('hidden_images')}`);
    }
  } else {
    console.log('カラム一覧:', columns);
  }
}

testPublicPropertyImages().catch(console.error);
