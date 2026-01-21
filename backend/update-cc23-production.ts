import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function updateCC23Production() {
  try {
    console.log('🔄 本番環境のCC23を更新中...\n');

    // 本番環境のSupabase認証情報を使用
    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    console.log('Supabase URL:', supabaseUrl);
    console.log('Service Key exists:', !!supabaseServiceKey);
    console.log('');

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // お気に入り文言とパノラマURLを設定
    const favoriteComment = '仲介手数料がなんと0円！！！キャンペーン実施中です！\n収納スペースが豊富でウォークインクローゼット付き。広々とした使いやすいキッチンに加え、風通りのいい閑静な住宅地です。';
    const panoramaUrl = 'https://vrpanorama.athome.jp/panoramas/_NRVyzVdL4/embed?from=at&user_id=80401786';

    console.log('お気に入り文言:', favoriteComment.substring(0, 50) + '...');
    console.log('パノラマURL:', panoramaUrl);
    console.log('');

    const updateData = {
      favorite_comment: favoriteComment,
      athome_data: {
        panorama_url: panoramaUrl,
      },
      updated_at: new Date().toISOString(),
    };

    console.log('💾 property_detailsを更新中...');
    const { data, error } = await supabase
      .from('property_details')
      .update(updateData)
      .eq('property_number', 'CC23')
      .select();

    if (error) {
      console.error('❌ 更新エラー:', error.message);
      console.error('エラーコード:', error.code);
      console.error('エラー詳細:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ 更新されたレコードがありません。CC23のproperty_detailsレコードが存在しない可能性があります。');
      console.log('');
      console.log('📊 CC23のproperty_detailsを確認中...');
      
      const { data: checkData, error: checkError } = await supabase
        .from('property_details')
        .select('*')
        .eq('property_number', 'CC23');

      if (checkError) {
        console.error('❌ 確認エラー:', checkError.message);
      } else if (!checkData || checkData.length === 0) {
        console.log('❌ CC23のproperty_detailsレコードが存在しません！');
        console.log('');
        console.log('💡 解決策: property_detailsレコードを作成する必要があります。');
      } else {
        console.log('✅ CC23のproperty_detailsレコードは存在します');
        console.log('レコード:', checkData[0]);
      }
      return;
    }

    console.log('✅ property_details更新成功');
    console.log('更新されたレコード数:', data.length);
    console.log('');
    console.log('🎉 本番環境のCC23データ更新が完了しました！');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

updateCC23Production();
