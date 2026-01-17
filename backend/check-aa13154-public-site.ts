import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkAA13154() {
  console.log('=== AA13154 公開物件サイト診断 ===\n');
  
  // 1. property_listingsテーブルで検索
  const { data, error } = await supabase
    .from('property_listings')
    .select('*')
    .eq('property_number', 'AA13154')
    .single();
  
  if (error) {
    console.log('❌ エラー:', error.message);
    return;
  }
  
  if (!data) {
    console.log('❌ AA13154はデータベースに存在しません');
    return;
  }
  
  console.log('✅ AA13154が見つかりました\n');
  console.log('📋 物件情報:');
  console.log('  物件番号:', data.property_number);
  console.log('  物件ID:', data.id);
  console.log('  物件タイプ:', data.property_type);
  console.log('  住所:', data.address);
  console.log('  価格:', data.price);
  console.log('  atbb_status:', data.atbb_status);
  console.log('  status:', data.status);
  console.log('  storage_location:', data.storage_location || '(NULL)');
  console.log('  image_url:', data.image_url || '(NULL)');
  console.log('  created_at:', data.created_at);
  console.log('  updated_at:', data.updated_at);
  
  console.log('\n📊 公開物件サイト表示条件:');
  console.log('  ✓ atbb_status = "専任・公開中" が必要');
  console.log('  現在の値:', data.atbb_status);
  
  if (data.atbb_status === '専任・公開中') {
    console.log('  ✅ 公開条件を満たしています');
    console.log('\n🌐 公開URL:');
    const baseUrl = process.env.VITE_APP_URL || 'http://localhost:5173';
    console.log(`  ${baseUrl}/public/properties/${data.id}`);
  } else {
    console.log('  ❌ 公開条件を満たしていません');
    console.log('  💡 atbb_statusを「専任・公開中」に変更する必要があります');
  }
  
  // 2. 公開物件APIで取得できるか確認
  console.log('\n🔍 公開物件APIでの取得テスト:');
  const { data: publicData, error: publicError } = await supabase
    .from('property_listings')
    .select('id, property_number, atbb_status')
    .eq('id', data.id)
    .eq('atbb_status', '専任・公開中')
    .single();
  
  if (publicError || !publicData) {
    console.log('  ❌ 公開物件APIで取得できません');
    console.log('  理由: atbb_statusが「専任・公開中」ではない');
  } else {
    console.log('  ✅ 公開物件APIで取得できます');
  }
  
  // 3. 他の公開物件と比較
  console.log('\n📊 参考: 公開中の物件数:');
  const { data: publicProperties, count } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status', { count: 'exact' })
    .eq('atbb_status', '専任・公開中')
    .limit(5);
  
  console.log(`  公開中の物件: ${count}件`);
  if (publicProperties && publicProperties.length > 0) {
    console.log('  例:');
    publicProperties.forEach(p => {
      console.log(`    - ${p.property_number} (${p.atbb_status})`);
    });
  }
  
  // 4. AA13154の全ステータス履歴を確認
  console.log('\n📝 結論:');
  if (data.atbb_status === '専任・公開中') {
    console.log('  AA13154は公開物件サイトに表示されるはずです');
    console.log('  もし表示されない場合は、以下を確認してください:');
    console.log('    1. フロントエンドのキャッシュをクリア');
    console.log('    2. バックエンドを再起動');
    console.log('    3. ブラウザのキャッシュをクリア');
  } else {
    console.log('  AA13154は公開物件サイトに表示されません');
    console.log(`  理由: atbb_statusが「${data.atbb_status}」です`);
    console.log('  対処法: atbb_statusを「専任・公開中」に変更してください');
  }
}

checkAA13154();
