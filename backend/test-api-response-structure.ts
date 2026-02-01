/**
 * APIレスポンスの構造を確認するテスト
 * フロントエンドのfetchSidebarSellersと同じ方法でAPIを呼び出す
 */

import 'dotenv/config';
import { SellerService } from './src/services/SellerService.supabase';

async function testApiResponseStructure() {
  console.log('=== APIレスポンス構造テスト ===\n');
  
  const sellerService = new SellerService();
  
  // visitScheduledカテゴリを取得
  const result = await sellerService.listSellers({
    page: 1,
    pageSize: 500,
    sortBy: 'next_call_date',
    sortOrder: 'asc',
    statusCategory: 'visitScheduled' as any,
  });
  
  console.log('=== listSellersの戻り値構造 ===');
  console.log('result keys:', Object.keys(result));
  console.log('result.data type:', typeof result.data);
  console.log('result.data is array:', Array.isArray(result.data));
  console.log('result.data length:', result.data?.length);
  
  if (result.data && result.data.length > 0) {
    console.log('\n=== 最初の売主データ ===');
    const firstSeller = result.data[0];
    console.log('sellerNumber:', firstSeller.sellerNumber);
    console.log('visitDate:', firstSeller.visitDate);
    console.log('visitAssignee:', firstSeller.visitAssignee);
    console.log('visit_date:', firstSeller.visit_date);
    console.log('visit_assignee:', firstSeller.visit_assignee);
  }
  
  // フロントエンドのAPIレスポンス形式をシミュレート
  // Express APIは { data: result.data, total: result.total, ... } を返す
  const apiResponse = {
    data: result.data,
    total: result.total,
    page: result.page,
    pageSize: result.pageSize,
  };
  
  console.log('\n=== Express APIレスポンス形式 ===');
  console.log('apiResponse.data type:', typeof apiResponse.data);
  console.log('apiResponse.data is array:', Array.isArray(apiResponse.data));
  console.log('apiResponse.data length:', apiResponse.data?.length);
  
  // フロントエンドのfetchSidebarSellersでの取得方法
  // const sellers = response.data?.data || [];
  console.log('\n=== フロントエンドでの取得方法 ===');
  console.log('response.data?.data:', apiResponse.data?.data);
  console.log('response.data?.data || []:', apiResponse.data?.data || []);
  console.log('正しい取得方法: response.data:', apiResponse.data);
  
  console.log('\n=== テスト完了 ===');
}

testApiResponseStructure().catch(console.error);
