// CC23のデータを確認
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCC23Data() {
  console.log('=== CC23のデータ確認 ===\n');
  
  const propertyNumber = 'CC23';
  
  // 1. property_listingsテーブルから基本情報を取得
  console.log('1. property_listingsテーブルから基本情報を取得');
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (propertyError) {
    console.error('❌ エラー:', propertyError);
    return;
  }
  
  console.log('✓ 物件番号:', property.property_number);
  console.log('✓ 住所:', property.address);
  console.log('✓ 物件タイプ:', property.property_type);
  console.log('✓ ATBB状態:', property.atbb_status);
  console.log('✓ 格納先URL:', property.storage_location);
  
  // 2. property_detailsテーブルからお気に入り文言とおすすめコメントを取得
  console.log('\n2. property_detailsテーブルからお気に入り文言とおすすめコメントを取得');
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('favorite_comment, recommended_comments, property_about')
    .eq('property_number', propertyNumber)
    .single();
  
  if (detailsError) {
    console.error('❌ エラー:', detailsError);
  } else {
    console.log('✓ お気に入り文言:', details.favorite_comment || '（なし）');
    console.log('✓ おすすめコメント:', details.recommended_comments ? 'あり' : '（なし）');
    if (details.recommended_comments) {
      console.log('   内容:', JSON.stringify(details.recommended_comments, null, 2));
    }
    console.log('✓ 物件について:', details.property_about || '（なし）');
  }
  
  // 3. /api/public/properties/:id/completeエンドポイントをテスト
  console.log('\n3. /api/public/properties/:id/completeエンドポイントをテスト');
  const apiUrl = 'https://baikyaku-property-site3.vercel.app';
  
  try {
    const response = await fetch(`${apiUrl}/api/public/properties/${property.id}/complete`);
    const data = await response.json();
    
    console.log('✓ ステータス:', response.status);
    console.log('✓ お気に入り文言:', data.favoriteComment || '（なし）');
    console.log('✓ おすすめコメント:', data.recommendedComments ? 'あり' : '（なし）');
    if (data.recommendedComments) {
      console.log('   内容:', JSON.stringify(data.recommendedComments, null, 2));
    }
    console.log('✓ 物件について:', data.propertyAbout || '（なし）');
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkCC23Data().catch(console.error);
