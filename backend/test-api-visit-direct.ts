/**
 * バックエンドAPIを直接呼び出して訪問予定/訪問済みのデータを確認
 * 認証をバイパスしてSellerServiceを直接呼び出す
 */

import dotenv from 'dotenv';
// .env.localを先に読み込んで優先させる
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

import { SellerService } from './src/services/SellerService.supabase';

async function main() {
  console.log('=== バックエンドAPIの訪問予定/訪問済みデータ確認 ===');
  console.log('');
  
  const sellerService = new SellerService();
  
  // 訪問予定を取得
  console.log('--- statusCategory=visitScheduled ---');
  const visitScheduledResult = await sellerService.listSellers({
    page: 1,
    pageSize: 500,
    sortBy: 'next_call_date',
    sortOrder: 'asc',
    statusCategory: 'visitScheduled',
  });
  
  console.log('total:', visitScheduledResult.total);
  console.log('data配列の長さ:', visitScheduledResult.data?.length || 0);
  
  if (visitScheduledResult.data && visitScheduledResult.data.length > 0) {
    console.log('');
    console.log('訪問予定の売主:');
    visitScheduledResult.data.forEach((seller: any) => {
      console.log(`  ${seller.sellerNumber}: visitDate=${seller.visitDate}, visitAssignee=${seller.visitAssignee}`);
    });
  }
  
  console.log('');
  
  // 訪問済みを取得
  console.log('--- statusCategory=visitCompleted ---');
  const visitCompletedResult = await sellerService.listSellers({
    page: 1,
    pageSize: 500,
    sortBy: 'next_call_date',
    sortOrder: 'asc',
    statusCategory: 'visitCompleted',
  });
  
  console.log('total:', visitCompletedResult.total);
  console.log('data配列の長さ:', visitCompletedResult.data?.length || 0);
  
  if (visitCompletedResult.data && visitCompletedResult.data.length > 0) {
    console.log('');
    console.log('訪問済みの売主（最初の10件）:');
    visitCompletedResult.data.slice(0, 10).forEach((seller: any) => {
      console.log(`  ${seller.sellerNumber}: visitDate=${seller.visitDate}, visitAssignee=${seller.visitAssignee}`);
    });
  }
  
  console.log('');
  console.log('=== 結果サマリー ===');
  console.log('訪問予定:', visitScheduledResult.total, '件');
  console.log('訪問済み:', visitCompletedResult.total, '件');
}

main().catch(console.error);
