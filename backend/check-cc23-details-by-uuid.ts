import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC23Details() {
  try {
    console.log('🔍 CC23の詳細データを確認中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const cc23UUID = '56793363-ced0-47e1-89e3-db4046281525';

    // property_listingsを確認
    console.log('=== property_listings ===');
    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('id', cc23UUID)
      .single();

    if (listingError) {
      console.error('❌ エラー:', listingError.message);
      return;
    }

    console.log('物件番号:', listing.property_number);
    console.log('物件種別:', listing.property_type);
    console.log('価格:', listing.price);
    console.log('住所:', listing.address);
    console.log('ATBB状態:', listing.atbb_status);
    console.log('');

    // property_detailsを確認
    console.log('=== property_details ===');
    const { data: details, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_id', cc23UUID)
      .single();

    if (detailsError) {
      console.error('❌ エラー:', detailsError.message);
      if (detailsError.code === 'PGRST116') {
        console.log('⚠️ property_detailsレコードが存在しません！');
        console.log('');
        console.log('💡 解決策: sync-cc23-complete-data.tsを実行してデータを同期してください');
      }
    } else {
      console.log('✅ property_detailsレコードが見つかりました');
      console.log('');
      console.log('お気に入り文言:', details.favorite_comment || '(なし)');
      console.log('パノラマURL:', details.panorama_url || '(なし)');
      console.log('');
      
      console.log('おすすめコメント:');
      const comments = [
        details.recommended_comment_1,
        details.recommended_comment_2,
        details.recommended_comment_3,
        details.recommended_comment_4,
        details.recommended_comment_5,
        details.recommended_comment_6,
        details.recommended_comment_7,
        details.recommended_comment_8,
        details.recommended_comment_9,
        details.recommended_comment_10,
        details.recommended_comment_11,
        details.recommended_comment_12,
      ].filter(c => c);

      if (comments.length > 0) {
        comments.forEach((comment, index) => {
          console.log(`  ${index + 1}. ${comment}`);
        });
      } else {
        console.log('  (なし)');
      }
    }

    console.log('');
    console.log('=== property_images ===');
    const { data: images, error: imagesError } = await supabase
      .from('property_images')
      .select('*')
      .eq('property_id', cc23UUID)
      .order('display_order', { ascending: true });

    if (imagesError) {
      console.error('❌ エラー:', imagesError.message);
    } else {
      console.log(`画像数: ${images?.length || 0}`);
      if (images && images.length > 0) {
        images.slice(0, 5).forEach((img, index) => {
          console.log(`  ${index + 1}. ${img.image_url.substring(0, 80)}...`);
        });
        if (images.length > 5) {
          console.log(`  ... 他 ${images.length - 5} 件`);
        }
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkCC23Details();
