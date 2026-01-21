import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkCC23Database() {
  try {
    console.log('🔍 CC23のデータベースデータを確認中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // property_listingsテーブルを確認
    console.log('=== property_listings テーブル ===');
    const { data: listings, error: listingError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'cc23');

    if (listingError) {
      console.error('❌ エラー:', listingError.message);
      return;
    } else if (!listings || listings.length === 0) {
      console.log('❌ CC23が見つかりません');
      return;
    } else {
      console.log(`✅ CC23が ${listings.length} 件見つかりました`);
      console.log('');

      // 最初のレコードを使用
      const listing = listings[0];
      if (listings.length > 1) {
        console.log('⚠️ 複数のCC23レコードが存在します:');
        listings.forEach((l, index) => {
          console.log(`  ${index + 1}. UUID: ${l.id}, ATBB状態: ${l.atbb_status}`);
        });
        console.log('');
        console.log('最初のレコードを使用します:');
      }
      console.log('✅ CC23が見つかりました');
      console.log('UUID:', listing.id);
      console.log('物件番号:', listing.property_number);
      console.log('物件種別:', listing.property_type);
      console.log('価格:', listing.price);
      console.log('住所:', listing.address);
      console.log('ATBB状態:', listing.atbb_status);
      console.log('');

      // property_detailsテーブルを確認
      console.log('=== property_details テーブル ===');
      const { data: details, error: detailsError } = await supabase
        .from('property_details')
        .select('*')
        .eq('property_id', listing.id)
        .single();

      if (detailsError) {
        console.error('❌ エラー:', detailsError.message);
        console.log('');
        console.log('⚠️ property_detailsレコードが存在しません');
      } else if (!details) {
        console.log('❌ property_detailsレコードが見つかりません');
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
      console.log('=== property_images テーブル ===');
      const { data: images, error: imagesError } = await supabase
        .from('property_images')
        .select('*')
        .eq('property_id', listing.id)
        .order('display_order', { ascending: true });

      if (imagesError) {
        console.error('❌ エラー:', imagesError.message);
      } else {
        console.log(`画像数: ${images?.length || 0}`);
        if (images && images.length > 0) {
          images.slice(0, 3).forEach((img, index) => {
            console.log(`  ${index + 1}. ${img.image_url}`);
          });
          if (images.length > 3) {
            console.log(`  ... 他 ${images.length - 3} 件`);
          }
        }
      }
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
  }
}

checkCC23Database();
