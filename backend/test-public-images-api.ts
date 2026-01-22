/**
 * 公開物件画像APIのテスト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testPublicImagesApi() {
  const propertyId = '593c43f9-8e10-4eea-8209-64849111f3364';
  
  console.log('=== 公開物件画像APIテスト ===\n');
  
  // 1. property_listingsテーブルのスキーマを確認
  console.log('1. property_listingsテーブルのカラムを確認...');
  const { data: columns, error: columnsError } = await supabase
    .rpc('get_table_columns', { table_name: 'property_listings' })
    .select('*');
  
  if (columnsError) {
    console.log('カラム取得エラー（RPCが存在しない可能性）:', columnsError.message);
    
    // 代替方法: 1行取得してカラムを確認
    const { data: sample, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1)
      .single();
    
    if (sampleError) {
      console.log('サンプルデータ取得エラー:', sampleError.message);
    } else if (sample) {
      console.log('property_listingsのカラム:', Object.keys(sample));
      console.log('hidden_imagesカラムが存在:', 'hidden_images' in sample);
    }
  } else {
    console.log('カラム一覧:', columns);
  }
  
  // 2. 物件データを取得
  console.log('\n2. 物件データを取得...');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('id, property_number, hidden_images')
    .eq('id', propertyId)
    .single();
  
  if (propertyError) {
    console.log('物件取得エラー:', propertyError.message);
    console.log('エラーコード:', propertyError.code);
    console.log('エラー詳細:', propertyError.details);
    console.log('エラーヒント:', propertyError.hint);
  } else {
    console.log('物件データ:', property);
  }
  
  // 3. work_tasksテーブルからstorage_urlを取得
  console.log('\n3. work_tasksテーブルからstorage_urlを取得...');
  if (property?.property_number) {
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('property_number, storage_url')
      .eq('property_number', property.property_number)
      .single();
    
    if (workTaskError) {
      console.log('work_tasks取得エラー:', workTaskError.message);
    } else {
      console.log('work_tasksデータ:', workTask);
    }
  }
  
  // 4. hidden_imagesカラムが存在しない場合、追加が必要
  console.log('\n4. hidden_imagesカラムの存在確認...');
  const { data: checkHidden, error: checkHiddenError } = await supabase
    .from('property_listings')
    .select('hidden_images')
    .limit(1);
  
  if (checkHiddenError) {
    console.log('hidden_imagesカラムが存在しない可能性:', checkHiddenError.message);
    console.log('\n=== 解決策 ===');
    console.log('以下のSQLをSupabaseで実行してください:');
    console.log(`
ALTER TABLE property_listings 
ADD COLUMN IF NOT EXISTS hidden_images TEXT[] DEFAULT '{}';
    `);
  } else {
    console.log('hidden_imagesカラムは存在します');
    console.log('サンプルデータ:', checkHidden);
  }
}

testPublicImagesApi().catch(console.error);
