import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PanoramaUrlService } from './src/services/PanoramaUrlService';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';

dotenv.config();

async function syncCC23WithServices() {
  console.log('🔄 スクリプト開始...\n');
  try {
    console.log('🔄 CC23のデータを既存サービスで同期中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // CC23のUUIDを取得
    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('id, property_number')
      .eq('property_number', 'CC23')
      .single();

    if (listingError || !listing) {
      console.error('❌ CC23が見つかりません:', listingError?.message);
      return;
    }

    console.log('✅ CC23を発見');
    console.log('UUID:', listing.id);
    console.log('物件番号:', listing.property_number);
    console.log('');

    // パノラマURLを取得
    console.log('📡 パノラマURL取得中...');
    const panoramaService = new PanoramaUrlService();
    const panoramaUrl = await panoramaService.getPanoramaUrl('CC23');
    console.log('パノラマURL:', panoramaUrl || '(なし)');
    console.log('');

    // お気に入り文言を取得
    console.log('📡 お気に入り文言取得中...');
    const favoriteCommentService = new FavoriteCommentService();
    const favoriteComment = await favoriteCommentService.getFavoriteComment(listing.id);
    console.log('お気に入り文言:', favoriteComment.comment || '(なし)');
    console.log('物件タイプ:', favoriteComment.propertyType);
    console.log('');

    // property_detailsを更新
    console.log('💾 property_detailsを更新中...');

    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (favoriteComment.comment) {
      updateData.favorite_comment = favoriteComment.comment;
    }

    if (panoramaUrl) {
      // athome_dataにパノラマURLを保存
      updateData.athome_data = {
        panorama_url: panoramaUrl,
      };
    }

    const { data, error } = await supabase
      .from('property_details')
      .update(updateData)
      .eq('property_number', 'CC23')
      .select();

    if (error) {
      console.error('❌ 更新エラー:', error.message);
      return;
    }

    console.log('✅ property_details更新成功');
    console.log('');
    console.log('=== 更新後のデータ ===');
    console.log('お気に入り文言:', favoriteComment.comment ? '設定済み' : '未設定');
    console.log('パノラマURL:', panoramaUrl ? '設定済み' : '未設定');
    console.log('');
    console.log('🎉 CC23のデータ同期が完了しました！');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

syncCC23WithServices().catch(err => {
  console.error('❌ 致命的エラー:', err);
  process.exit(1);
});
