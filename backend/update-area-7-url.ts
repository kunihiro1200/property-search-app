import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateArea7Url() {
  console.log('⑦のエリアマップURLを更新します...');
  
  const oldUrl = 'https://maps.app.goo.gl/s5RNPErktbAB3xxs7';
  const newUrl = 'https://maps.app.goo.gl/UMvP5iD5ttYvpz9i8';
  
  // 現在のデータを確認
  const { data: currentData, error: fetchError } = await supabase
    .from('area_map_config')
    .select('*')
    .eq('area_number', '⑦')
    .single();
  
  if (fetchError) {
    console.error('❌ エラー: ⑦のデータ取得に失敗:', fetchError);
    return;
  }
  
  console.log('\n現在のデータ:');
  console.log('  エリア番号:', currentData.area_number);
  console.log('  現在のURL:', currentData.google_map_url);
  console.log('  更新日時:', currentData.updated_at);
  
  // URLを更新
  const { data: updateData, error: updateError } = await supabase
    .from('area_map_config')
    .update({
      google_map_url: newUrl,
      updated_at: new Date().toISOString()
    })
    .eq('area_number', '⑦')
    .select();
  
  if (updateError) {
    console.error('❌ エラー: URL更新に失敗:', updateError);
    return;
  }
  
  console.log('\n✅ 更新完了:');
  console.log('  エリア番号:', updateData[0].area_number);
  console.log('  旧URL:', oldUrl);
  console.log('  新URL:', updateData[0].google_map_url);
  console.log('  更新日時:', updateData[0].updated_at);
  
  // 更新後のデータを確認
  const { data: verifyData, error: verifyError } = await supabase
    .from('area_map_config')
    .select('*')
    .eq('area_number', '⑦')
    .single();
  
  if (verifyError) {
    console.error('❌ エラー: 検証に失敗:', verifyError);
    return;
  }
  
  console.log('\n検証結果:');
  console.log('  エリア番号:', verifyData.area_number);
  console.log('  GoogleマップURL:', verifyData.google_map_url);
  console.log('  アクティブ:', verifyData.is_active);
  console.log('  更新日時:', verifyData.updated_at);
  
  if (verifyData.google_map_url === newUrl) {
    console.log('\n✅ URLが正しく更新されました！');
  } else {
    console.log('\n⚠️ 警告: URLが期待通りに更新されていません');
  }
}

updateArea7Url()
  .then(() => {
    console.log('\n処理が完了しました。');
    process.exit(0);
  })
  .catch((error) => {
    console.error('予期しないエラー:', error);
    process.exit(1);
  });
