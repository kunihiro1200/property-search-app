/**
 * AA13241を削除するスクリプト
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function deleteAA13241() {
  console.log('=== AA13241 削除 ===\n');

  const sellerId = 'e393b473-a9d6-47b2-9553-0401ee33921e';
  const sellerNumber = 'AA13241';

  try {
    // 関連する物件を削除
    console.log('物件を削除中...');
    const { error: propError } = await supabase
      .from('properties')
      .delete()
      .eq('seller_id', sellerId);

    if (propError) {
      console.log(`  ⚠️ 物件削除エラー: ${propError.message}`);
    } else {
      console.log('  ✅ 物件削除完了');
    }

    // 関連するアクティビティを削除
    console.log('アクティビティを削除中...');
    const { error: actError } = await supabase
      .from('activities')
      .delete()
      .eq('seller_id', sellerId);

    if (actError) {
      console.log(`  ⚠️ アクティビティ削除エラー: ${actError.message}`);
    } else {
      console.log('  ✅ アクティビティ削除完了');
    }

    // 関連する予約を削除
    console.log('予約を削除中...');
    const { error: apptError } = await supabase
      .from('appointments')
      .delete()
      .eq('seller_id', sellerId);

    if (apptError) {
      console.log(`  ⚠️ 予約削除エラー: ${apptError.message}`);
    } else {
      console.log('  ✅ 予約削除完了');
    }

    // 売主を削除
    console.log('売主を削除中...');
    const { error: sellerError } = await supabase
      .from('sellers')
      .delete()
      .eq('id', sellerId);

    if (sellerError) {
      console.log(`  ❌ 売主削除エラー: ${sellerError.message}`);
    } else {
      console.log(`  ✅ ${sellerNumber} 削除完了`);
    }

    // 確認
    const { data: check } = await supabase
      .from('sellers')
      .select('id')
      .eq('seller_number', sellerNumber)
      .maybeSingle();

    if (check) {
      console.log('\n❌ 削除に失敗しました。まだ存在しています。');
    } else {
      console.log('\n✅ 削除が完了しました。');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

deleteAA13241().catch(console.error);
