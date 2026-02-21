/**
 * 買主番号6927を復元
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function restoreBuyer6927() {
  console.log('=== 買主番号6927を復元 ===\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // 1. 現在の状態を確認
    console.log('1. 現在の状態を確認...\n');
    const { data: buyer, error: fetchError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6927')
      .single();

    if (fetchError) {
      console.log('❌ エラー:', fetchError.message);
      return;
    }

    if (!buyer) {
      console.log('❌ 買主番号6927が見つかりません');
      return;
    }

    console.log('✅ 買主番号6927が見つかりました');
    console.log('   buyer_number:', buyer.buyer_number);
    console.log('   name:', buyer.name);
    console.log('   deleted_at:', buyer.deleted_at);
    console.log('');

    if (!buyer.deleted_at) {
      console.log('✅ 既に復元されています（deleted_atがnull）');
      return;
    }

    // 2. deleted_atをnullに設定して復元
    console.log('2. deleted_atをnullに設定して復元...\n');
    const { data: restored, error: updateError } = await supabase
      .from('buyers')
      .update({ deleted_at: null })
      .eq('buyer_number', '6927')
      .select()
      .single();

    if (updateError) {
      console.log('❌ 復元エラー:', updateError.message);
      return;
    }

    console.log('✅ 買主番号6927を復元しました');
    console.log('   buyer_number:', restored.buyer_number);
    console.log('   name:', restored.name);
    console.log('   deleted_at:', restored.deleted_at);
    console.log('');

    // 3. 確認
    console.log('3. 復元を確認...\n');
    const { data: verified, error: verifyError } = await supabase
      .from('buyers')
      .select('*')
      .eq('buyer_number', '6927')
      .is('deleted_at', null)
      .single();

    if (verifyError) {
      console.log('❌ 確認エラー:', verifyError.message);
      return;
    }

    if (verified) {
      console.log('✅ 復元が確認されました');
      console.log('   buyer_number:', verified.buyer_number);
      console.log('   name:', verified.name);
      console.log('   deleted_at:', verified.deleted_at);
      console.log('');
    }

    console.log('=== 復元完了 ===\n');
    console.log('フロントエンドで買主番号6927が表示されるようになりました。');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

restoreBuyer6927()
  .then(() => {
    console.log('処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
