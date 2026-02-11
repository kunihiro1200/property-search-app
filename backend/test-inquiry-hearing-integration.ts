/**
 * 問合せ時ヒアリング自動反映機能の統合テスト
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testIntegration() {
  console.log('=== 問合せ時ヒアリング自動反映機能 統合テスト ===\n');

  try {
    // テスト用の買主を検索（買主番号5093を使用）
    const testBuyerNumber = '5093';
    
    console.log(`テスト対象買主: ${testBuyerNumber}`);
    
    // 現在の状態を取得
    const { data: before, error: beforeError } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_hearing, desired_timing, parking_spaces, price_range_house, price_range_apartment, price_range_land, inquiry_hearing_updated_at, desired_timing_updated_at, parking_spaces_updated_at, price_range_house_updated_at, price_range_apartment_updated_at, price_range_land_updated_at')
      .eq('buyer_number', testBuyerNumber)
      .single();
    
    if (beforeError) {
      console.error('❌ 買主の取得に失敗:', beforeError.message);
      return;
    }
    
    console.log('\n【更新前の状態】');
    console.log('問合せ時ヒアリング:', before.inquiry_hearing || '(空)');
    console.log('希望時期:', before.desired_timing || '(空)');
    console.log('駐車場希望台数:', before.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', before.price_range_house || '(空)');
    console.log('価格帯（マンション）:', before.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', before.price_range_land || '(空)');
    console.log('');

    // 問合せ時ヒアリングを更新（テストデータ）
    const testInquiryHearing = `希望時期：2年以内
駐車場希望台数：2台
予算：3000万円`;

    console.log('【更新内容】');
    console.log('問合せ時ヒアリング:');
    console.log(testInquiryHearing);
    console.log('');

    // BuyerServiceのupdate()メソッドを使用して更新
    // （実際のAPIエンドポイントを経由する代わりに、直接Supabaseで更新）
    const { data: updated, error: updateError } = await supabase
      .from('buyers')
      .update({
        inquiry_hearing: testInquiryHearing,
        updated_at: new Date().toISOString()
      })
      .eq('buyer_number', testBuyerNumber)
      .select()
      .single();
    
    if (updateError) {
      console.error('❌ 更新に失敗:', updateError.message);
      return;
    }

    console.log('✅ 問合せ時ヒアリングを更新しました');
    console.log('');

    // 注意: この統合テストでは、BuyerServiceのupdate()メソッドを経由していないため、
    // 自動パース処理は実行されません。実際のAPIエンドポイント経由でテストする必要があります。
    console.log('⚠️  注意: この統合テストでは、直接Supabaseで更新しているため、');
    console.log('   自動パース処理は実行されません。');
    console.log('   実際のAPIエンドポイント（PUT /api/buyers/:id）経由でテストしてください。');
    console.log('');

    // 更新後の状態を取得
    const { data: after, error: afterError } = await supabase
      .from('buyers')
      .select('buyer_number, inquiry_hearing, desired_timing, parking_spaces, price_range_house, price_range_apartment, price_range_land, inquiry_hearing_updated_at, desired_timing_updated_at, parking_spaces_updated_at, price_range_house_updated_at, price_range_apartment_updated_at, price_range_land_updated_at')
      .eq('buyer_number', testBuyerNumber)
      .single();
    
    if (afterError) {
      console.error('❌ 買主の取得に失敗:', afterError.message);
      return;
    }

    console.log('【更新後の状態】');
    console.log('問合せ時ヒアリング:', after.inquiry_hearing || '(空)');
    console.log('希望時期:', after.desired_timing || '(空)');
    console.log('駐車場希望台数:', after.parking_spaces || '(空)');
    console.log('価格帯（戸建）:', after.price_range_house || '(空)');
    console.log('価格帯（マンション）:', after.price_range_apartment || '(空)');
    console.log('価格帯（土地）:', after.price_range_land || '(空)');
    console.log('');

    console.log('【推奨テスト方法】');
    console.log('1. フロントエンドで買主詳細ページを開く');
    console.log('2. 問合せ時ヒアリングに以下を入力:');
    console.log('   希望時期：2年以内');
    console.log('   駐車場希望台数：2台');
    console.log('   予算：3000万円');
    console.log('3. 保存ボタンをクリック');
    console.log('4. 希望条件ページを開いて、自動反映されているか確認');
    console.log('');

    // 元の状態に戻す（テストデータをクリーンアップ）
    console.log('テストデータをクリーンアップ中...');
    await supabase
      .from('buyers')
      .update({
        inquiry_hearing: before.inquiry_hearing,
        updated_at: new Date().toISOString()
      })
      .eq('buyer_number', testBuyerNumber);
    
    console.log('✅ テストデータをクリーンアップしました');

  } catch (error) {
    console.error('❌ テストに失敗:', error);
  }
}

testIntegration();
