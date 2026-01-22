import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkRecentUpdates() {
  console.log('🔍 最近更新された物件リストを確認中...\n');
  console.log('================================================================================\n');

  // 過去24時間に更新された物件を取得
  const oneDayAgo = new Date();
  oneDayAgo.setDate(oneDayAgo.getDate() - 1);

  const { data, error } = await supabase
    .from('property_listings')
    .select('property_number, atbb_status, status, storage_location, updated_at')
    .gte('updated_at', oneDayAgo.toISOString())
    .order('updated_at', { ascending: false })
    .limit(20);

  if (error) {
    console.error('❌ エラー:', error.message);
    return;
  }

  if (!data || data.length === 0) {
    console.log('⚠️  過去24時間に更新された物件リストはありません');
    console.log('');
    console.log('💡 ヒント:');
    console.log('   - 自動同期が有効になっているか確認してください');
    console.log('   - バックエンドログで "Phase 4.5: Property Listing Update Sync" を確認してください');
    console.log('   - スプレッドシートで物件データを変更してみてください');
    return;
  }

  console.log(`✅ 過去24時間に更新された物件リスト: ${data.length}件\n`);
  console.log('================================================================================\n');

  for (const property of data) {
    console.log(`📋 物件番号: ${property.property_number}`);
    console.log(`   ATBB状態: ${property.atbb_status || '(なし)'}`);
    console.log(`   状況: ${property.status || '(なし)'}`);
    console.log(`   格納先URL: ${property.storage_location ? '✅ 設定済み' : '❌ (なし)'}`);
    console.log(`   更新日時: ${new Date(property.updated_at).toLocaleString('ja-JP')}`);
    console.log('');
  }

  console.log('================================================================================\n');
  console.log('✅ 確認完了');
}

checkRecentUpdates().catch(console.error);
