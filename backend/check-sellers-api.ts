/**
 * 売主APIエンドポイントをテスト
 */
import axios from 'axios';

async function checkSellersAPI() {
  try {
    console.log('🔍 売主APIエンドポイントをテスト中...\n');

    const baseUrl = 'http://localhost:3000';

    // 1. 認証なしでアクセス
    console.log('1️⃣ 認証なしでアクセス...');
    try {
      const response = await axios.get(`${baseUrl}/api/sellers`, {
        params: { page: 1, limit: 10 },
      });
      console.log('✅ 成功（認証不要）');
      console.log('   Total sellers:', response.data.total);
      console.log('   Returned:', response.data.sellers?.length || 0);
    } catch (error: any) {
      if (error.response) {
        console.log('❌ エラー:', error.response.status, error.response.data);
      } else {
        console.log('❌ エラー:', error.message);
      }
    }

    console.log('');

    // 2. Supabase直接アクセス
    console.log('2️⃣ Supabase REST APIで直接アクセス...');
    try {
      const response = await axios.get(
        'https://krxhrbtlgfjzsseegaqq.supabase.co/rest/v1/sellers',
        {
          headers: {
            apikey: process.env.SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.SUPABASE_ANON_KEY!}`,
          },
          params: {
            select: 'id,seller_number,name,status',
            limit: 10,
          },
        }
      );
      console.log('✅ 成功');
      console.log('   Returned:', response.data.length, 'sellers');
      if (response.data.length > 0) {
        console.log('   Sample:', response.data[0]);
      }
    } catch (error: any) {
      if (error.response) {
        console.log('❌ エラー:', error.response.status);
        console.log('   Message:', error.response.data);
      } else {
        console.log('❌ エラー:', error.message);
      }
    }

    console.log('');

    // 3. RLS設定を確認
    console.log('3️⃣ RLS (Row Level Security) 設定を確認...');
    console.log('   → Supabase Dashboardで確認が必要です');
    console.log('   → https://supabase.com/dashboard/project/krxhrbtlgfjzsseegaqq/auth/policies');

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

checkSellersAPI();
