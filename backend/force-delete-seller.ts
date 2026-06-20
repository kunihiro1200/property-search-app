/**
 * 指定した売主を強制的にソフトデリートするスクリプト
 * 使用方法: npx ts-node backend/force-delete-seller.ts AA13490
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function forceDeleteSeller(sellerNumber: string) {
  console.log(`🗑️  ${sellerNumber}を強制削除中...\n`);

  // 1. 売主情報を取得
  const { data: seller, error: fetchError } = await supabase
    .from('sellers')
    .select('id, seller_number, status, deleted_at')
    .eq('seller_number', sellerNumber)
    .single();

  if (fetchError || !seller) {
    console.log(`❌ 売主が見つかりません: ${fetchError?.message}`);
    return;
  }

  if (seller.deleted_at) {
    console.log(`⚠️  ${sellerNumber}は既に削除済みです（deleted_at: ${seller.deleted_at}）`);
    return;
  }

  console.log(`📊 売主情報:`);
  console.log(`   - ID: ${seller.id}`);
  console.log(`   - 売主番号: ${seller.seller_number}`);
  console.log(`   - ステータス: ${seller.status}`);

  const deletedAt = new Date();

  // 2. 売主をソフトデリート
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

  console.log('\n🎉 完了!');
  console.log(`   ${sellerNumber}は正常にソフトデリートされました`);
}

// コマンドライン引数から売主番号を取得
const sellerNumber = process.argv[2] || 'AA13490';
forceDeleteSeller(sellerNumber).catch(console.error);
