import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function updateCC23Direct() {
  try {
    console.log('🔄 CC23のproperty_detailsを直接更新中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // お気に入り文言とパノラマURLを直接設定
    const favoriteComment = '仲介手数料がなんと0円！！！キャンペーン実施中です！\n収納スペースが豊富でウォークインクローゼット付き。広々とした使いやすいキッチンに加え、風通りのいい閑静な住宅地です。';
    const panoramaUrl = 'https://vrpanorama.athome.jp/panoramas/_NRVyzVdL4/embed?from=at&user_id=80401786';

    console.log('お気に入り文言:', favoriteComment);
    console.log('パノラマURL:', panoramaUrl);
    console.log('');

    const updateData = {
      favorite_comment: favoriteComment,
      athome_data: {
        panorama_url: panoramaUrl,
      },
      updated_at: new Date().toISOString(),
    };

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
    console.log('更新されたレコード:', data);
    console.log('');
    console.log('🎉 CC23のデータ更新が完了しました！');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

updateCC23Direct();
