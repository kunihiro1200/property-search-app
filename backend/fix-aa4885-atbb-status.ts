/**
 * AA4885 ATBB状態を手動で修正
 * スプレッドシートの値をDBに反映
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function fixAA4885() {
  console.log('='.repeat(60));
  console.log('AA4885 ATBB状態 手動修正');
  console.log('='.repeat(60));
  console.log();

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );

    // 1. 現在の状態を確認
    console.log('📊 Step 1: 現在の状態を確認');
    console.log('-'.repeat(60));
    
    const { data: before, error: beforeError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, updated_at')
      .eq('property_number', 'AA4885')
      .single();
    
    if (beforeError || !before) {
      console.log('❌ AA4885がDBに見つかりません:', beforeError?.message);
      return;
    }
    
    console.log(`物件番号: ${before.property_number}`);
    console.log(`現在のATBB状態: "${before.atbb_status}"`);
    console.log(`最終更新: ${before.updated_at}`);
    console.log();

    // 2. スプレッドシートの値に更新
    console.log('🔄 Step 2: スプレッドシートの値に更新');
    console.log('-'.repeat(60));
    
    const newAtbbStatus = '非公開（一般）';
    console.log(`新しいATBB状態: "${newAtbbStatus}"`);
    console.log();
    
    const { error: updateError } = await supabase
      .from('property_listings')
      .update({
        atbb_status: newAtbbStatus,
        updated_at: new Date().toISOString()
      })
      .eq('property_number', 'AA4885');
    
    if (updateError) {
      console.log('❌ 更新エラー:', updateError.message);
      return;
    }
    
    console.log('✅ 更新成功');
    console.log();

    // 3. 更新後の状態を確認
    console.log('✅ Step 3: 更新後の状態を確認');
    console.log('-'.repeat(60));
    
    const { data: after, error: afterError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, updated_at')
      .eq('property_number', 'AA4885')
      .single();
    
    if (afterError || !after) {
      console.log('❌ 確認エラー:', afterError?.message);
      return;
    }
    
    console.log(`物件番号: ${after.property_number}`);
    console.log(`更新後のATBB状態: "${after.atbb_status}"`);
    console.log(`最終更新: ${after.updated_at}`);
    console.log();

    // 4. 結果サマリー
    console.log('📝 修正サマリー');
    console.log('-'.repeat(60));
    console.log(`変更前: "${before.atbb_status}"`);
    console.log(`変更後: "${after.atbb_status}"`);
    console.log();
    
    if (after.atbb_status === newAtbbStatus) {
      console.log('🎉 修正完了！');
      console.log();
      console.log('次のステップ:');
      console.log('  1. ブラウザでAA4885を確認');
      console.log('  2. ATBB状態が「非公開（一般）」になっていることを確認');
      console.log('  3. バックエンドサーバーを起動して自動同期を有効化');
      console.log('     → cd backend && npm run dev');
    } else {
      console.log('⚠️  警告: 期待した値と異なります');
    }
    
    console.log();
    console.log('='.repeat(60));

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

fixAA4885().catch(console.error);
