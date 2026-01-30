/**
 * AA13494を強制的にソフトデリートするスクリプト
 * バリデーションをスキップして削除します
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function forceDeleteAA13494() {
  const sellerNumber = 'AA13494';
  console.log(`🗑️  ${sellerNumber}を強制削除中...\n`);

  // 1. 売主情報を取得
  const { data: seller, error: fetchError } = await supabase
    .from('sellers')
    .select('*')
    .eq('seller_number', sellerNumber)
    .is('deleted_at', null)
    .single();

  if (fetchError || !seller) {
    console.log(`❌ 売主が見つかりません: ${fetchError?.message}`);
    return;
  }

  console.log(`📊 売主情報:`);
  console.log(`   - ID: ${seller.id}`);
  console.log(`   - 売主番号: ${seller.seller_number}`);
  console.log(`   - ステータス: ${seller.status}`);

  const deletedAt = new Date();

  // 2. 売主をソフトデリート（監査ログはスキップ）
  console.log('\n🗑️  売主をソフトデリート中...');
  const { error: sellerDeleteError } = await supabase
    .from('sellers')
    .update({ deleted_at: deletedAt.toISOString() })
    .eq('id', seller.id);

  if (sellerDeleteError) {
    console.log(`❌ 売主削除失敗: ${sellerDeleteError.message}`);
    return;
  }
  console.log(`✅ 売主削除完了`);

  // 3. 関連物件をカスケードソフトデリート
  console.log('\n🗑️  関連物件をソフトデリート中...');
  const { data: properties, error: propertiesDeleteError } = await supabase
    .from('properties')
    .update({ deleted_at: deletedAt.toISOString() })
    .eq('seller_id', seller.id)
    .select('id');

  if (propertiesDeleteError) {
    console.log(`⚠️  関連物件削除失敗: ${propertiesDeleteError.message}`);
  } else {
    console.log(`✅ 関連物件削除完了 (${properties?.length || 0}件)`);
  }

  // 4. 完了
  console.log('\n🎉 完了!');
  console.log(`   ${sellerNumber}は正常にソフトデリートされました`);
}

forceDeleteAA13494().catch(console.error);
