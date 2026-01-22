import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function diagnoseSellersListError() {
  console.log('🔍 売主一覧エラーの診断を開始します...\n');

  try {
    // 1. 売主テーブルの総数を確認
    console.log('1️⃣ 売主テーブルの総数を確認:');
    const { count: totalCount, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);

    if (countError) {
      console.error('❌ エラー:', countError);
    } else {
      console.log(`✅ 削除されていない売主の総数: ${totalCount}件\n`);
    }

    // 2. 最初の10件を取得してみる
    console.log('2️⃣ 最初の10件を取得:');
    const { data: sellers, error: sellersError } = await supabase
      .from('sellers')
      .select('id, seller_number, name, phone_number, created_at, deleted_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10);

    if (sellersError) {
      console.error('❌ エラー:', sellersError);
    } else {
      console.log(`✅ 取得した売主数: ${sellers?.length || 0}件`);
      if (sellers && sellers.length > 0) {
        console.log('最初の3件:');
        sellers.slice(0, 3).forEach((seller, index) => {
          console.log(`  ${index + 1}. ${seller.seller_number} - 作成日: ${seller.created_at}`);
        });
      }
      console.log('');
    }

    // 3. 物件情報も含めて取得
    console.log('3️⃣ 物件情報も含めて取得:');
    const { data: sellersWithProps, error: propsError } = await supabase
      .from('sellers')
      .select('id, seller_number, properties(*)')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(5);

    if (propsError) {
      console.error('❌ エラー:', propsError);
    } else {
      console.log(`✅ 取得した売主数: ${sellersWithProps?.length || 0}件`);
      if (sellersWithProps && sellersWithProps.length > 0) {
        sellersWithProps.forEach((seller, index) => {
          const propCount = Array.isArray(seller.properties) ? seller.properties.length : (seller.properties ? 1 : 0);
          console.log(`  ${index + 1}. ${seller.seller_number} - 物件数: ${propCount}`);
        });
      }
      console.log('');
    }

    // 4. ページネーション付きで取得（実際のAPIと同じ）
    console.log('4️⃣ ページネーション付きで取得（page=1, pageSize=50）:');
    const page = 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const { data: paginatedSellers, error: paginatedError, count: paginatedCount } = await supabase
      .from('sellers')
      .select('*, properties(*)', { count: 'exact' })
      .is('deleted_at', null)
      .order('inquiry_date', { ascending: false, nullsFirst: false })
      .range(offset, offset + pageSize - 1);

    if (paginatedError) {
      console.error('❌ エラー:', paginatedError);
    } else {
      console.log(`✅ 取得した売主数: ${paginatedSellers?.length || 0}件`);
      console.log(`✅ 総数: ${paginatedCount}件`);
      console.log(`✅ 総ページ数: ${Math.ceil((paginatedCount || 0) / pageSize)}ページ\n`);
    }

    // 5. 削除済みの売主を確認
    console.log('5️⃣ 削除済みの売主を確認:');
    const { count: deletedCount, error: deletedError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .not('deleted_at', 'is', null);

    if (deletedError) {
      console.error('❌ エラー:', deletedError);
    } else {
      console.log(`✅ 削除済みの売主数: ${deletedCount}件\n`);
    }

    // 6. inquiry_dateがnullの売主を確認
    console.log('6️⃣ inquiry_dateがnullの売主を確認:');
    const { count: nullInquiryCount, error: nullInquiryError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .is('inquiry_date', null);

    if (nullInquiryError) {
      console.error('❌ エラー:', nullInquiryError);
    } else {
      console.log(`✅ inquiry_dateがnullの売主数: ${nullInquiryCount}件\n`);
    }

    // 7. 最近作成された売主を確認
    console.log('7️⃣ 最近作成された売主（過去7日間）:');
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: recentCount, error: recentError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (recentError) {
      console.error('❌ エラー:', recentError);
    } else {
      console.log(`✅ 過去7日間に作成された売主数: ${recentCount}件\n`);
    }

    console.log('✅ 診断完了');
    console.log('\n📊 サマリー:');
    console.log(`  - 総売主数（削除済み除く）: ${totalCount}件`);
    console.log(`  - 削除済み売主数: ${deletedCount}件`);
    console.log(`  - inquiry_dateがnull: ${nullInquiryCount}件`);
    console.log(`  - 過去7日間の新規作成: ${recentCount}件`);

  } catch (error) {
    console.error('❌ 診断中にエラーが発生しました:', error);
  }
}

diagnoseSellersListError();
