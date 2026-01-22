import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC23InPropertyListings() {
  try {
    console.log('🔍 本番環境のproperty_listingsテーブルでCC23を確認中...\n');

    // 本番環境のSupabase認証情報を使用
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service Key exists:', !!supabaseServiceKey);
    console.log('');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // property_listingsテーブルでCC23を検索
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'CC23');

    if (error) {
      console.error('❌ クエリエラー:', error.message);
      console.error('エラーコード:', error.code);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ property_listingsテーブルにCC23が見つかりません！');
      console.log('');
      console.log('💡 解決策: property_listingsテーブルにCC23を追加する必要があります。');
      console.log('');
      
      // CCで始まる物件を検索
      console.log('📊 CCで始まる物件を検索中...');
      const { data: ccProperties, error: ccError } = await supabase
        .from('property_listings')
        .select('property_number, property_type, address, price')
        .ilike('property_number', 'CC%')
        .order('property_number', { ascending: true });

      if (ccError) {
        console.error('❌ 検索エラー:', ccError.message);
      } else if (ccProperties && ccProperties.length > 0) {
        console.log(`✅ CCで始まる物件が${ccProperties.length}件見つかりました:`);
        ccProperties.forEach(prop => {
          console.log(`  - ${prop.property_number}: ${prop.property_type} (${prop.address})`);
        });
      } else {
        console.log('⚠️ CCで始まる物件が見つかりません');
      }
    } else {
      console.log('✅ property_listingsテーブルにCC23が見つかりました！');
      console.log('');
      console.log('=== CC23の基本情報 ===');
      console.log('ID:', data[0].id);
      console.log('物件番号:', data[0].property_number);
      console.log('物件種別:', data[0].property_type);
      console.log('住所:', data[0].address);
      console.log('価格:', data[0].price);
      console.log('ATBB状態:', data[0].atbb_status);
      console.log('格納先URL:', data[0].storage_location);
      console.log('');
      
      // property_detailsテーブルも確認
      console.log('📊 property_detailsテーブルも確認中...');
      const { data: detailsData, error: detailsError } = await supabase
        .from('property_details')
        .select('*')
        .eq('property_number', 'CC23');

      if (detailsError) {
        console.error('❌ property_detailsクエリエラー:', detailsError.message);
      } else if (!detailsData || detailsData.length === 0) {
        console.log('❌ property_detailsテーブルにCC23が見つかりません！');
      } else {
        console.log('✅ property_detailsテーブルにCC23が見つかりました！');
        console.log('');
        console.log('=== CC23の詳細情報 ===');
        console.log('お気に入り文言:', detailsData[0].favorite_comment ? '設定済み' : '未設定');
        console.log('おすすめコメント:', detailsData[0].recommended_comments ? `${detailsData[0].recommended_comments.length}件` : '未設定');
        console.log('athome_data:', detailsData[0].athome_data ? '設定済み' : '未設定');
        console.log('property_about:', detailsData[0].property_about ? '設定済み' : '未設定');
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

checkCC23InPropertyListings();
