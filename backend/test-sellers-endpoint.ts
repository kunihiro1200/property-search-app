import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

async function testSellersEndpoint() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Supabase環境変数が設定されていません');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🔍 売主エンドポイントをテスト中...\n');

  try {
    // SellerService.supabase.tsと同じクエリを実行
    console.log('1. 売主一覧を取得中（ページ1、50件）...');
    
    const page = 1;
    const pageSize = 50;
    const offset = (page - 1) * pageSize;

    const { data: sellers, error: sellersError, count } = await supabase
      .from('sellers')
      .select('*, properties(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (sellersError) {
      console.error('❌ エラー:', sellersError);
      console.error('   コード:', sellersError.code);
      console.error('   詳細:', sellersError.details);
      console.error('   ヒント:', sellersError.hint);
      console.error('   メッセージ:', sellersError.message);
      process.exit(1);
    }

    console.log(`✅ 成功！`);
    console.log(`   取得件数: ${sellers?.length || 0}件`);
    console.log(`   総件数: ${count}件\n`);

    if (sellers && sellers.length > 0) {
      console.log('📋 最初の売主:');
      const seller = sellers[0];
      console.log(`   ID: ${seller.id}`);
      console.log(`   売主番号: ${seller.seller_number}`);
      console.log(`   名前: ${seller.name}`);
      console.log(`   サイト: ${seller.site || 'なし'}`);
      console.log(`   物件数: ${seller.properties?.length || 0}件\n`);
    }

    console.log('✅ 全てのテストが成功しました！');
  } catch (error: any) {
    console.error('❌ 予期しないエラーが発生しました:', error.message);
    console.error('   スタック:', error.stack);
    process.exit(1);
  }
}

testSellersEndpoint();
