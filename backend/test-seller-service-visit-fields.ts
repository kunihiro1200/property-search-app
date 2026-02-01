/**
 * SellerServiceのdecryptSellerメソッドが返すフィールドを確認
 * visitDate, visitAssigneeが正しく含まれているか確認
 */

import { SellerService } from './src/services/SellerService.supabase';

async function testSellerServiceVisitFields() {
  console.log('=== SellerService visitフィールドテスト ===');
  console.log('');

  const sellerService = new SellerService();

  try {
    // listSellersでvisitScheduledカテゴリを取得して最初の売主を確認
    console.log('--- visitScheduledカテゴリの売主フィールド確認 ---');

    // listSellersでvisitScheduledカテゴリを取得
    console.log('\n--- listSellers(visitScheduled)のフィールド確認 ---');
    const result = await sellerService.listSellers({
      page: 1,
      pageSize: 5,
      statusCategory: 'visitScheduled',
    });

    console.log('取得件数:', result.data.length);
    result.data.forEach((seller: any, index: number) => {
      console.log(`\n[${index + 1}] ${seller.sellerNumber}`);
      console.log('  visitDate:', seller.visitDate);
      console.log('  visitAssignee:', seller.visitAssignee);
      console.log('  appointmentDate:', seller.appointmentDate);
      console.log('  assignedTo:', seller.assignedTo);
      
      // 全フィールドを確認
      console.log('  全フィールド（visit関連）:');
      const visitFields = ['visitDate', 'visitAssignee', 'visitTime', 'visitNotes', 
                          'visitAcquisitionDate', 'visitValuationAcquirer',
                          'appointmentDate', 'assignedTo', 'appointmentNotes'];
      visitFields.forEach(field => {
        const value = (seller as any)[field];
        if (value !== undefined && value !== null) {
          console.log(`    ${field}: ${value}`);
        }
      });
    });

    // visitCompletedカテゴリも確認
    console.log('\n--- listSellers(visitCompleted)のフィールド確認 ---');
    const result2 = await sellerService.listSellers({
      page: 1,
      pageSize: 5,
      statusCategory: 'visitCompleted',
    });

    console.log('取得件数:', result2.data.length);
    result2.data.slice(0, 3).forEach((seller: any, index: number) => {
      console.log(`\n[${index + 1}] ${seller.sellerNumber}`);
      console.log('  visitDate:', seller.visitDate);
      console.log('  visitAssignee:', seller.visitAssignee);
    });

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

testSellerServiceVisitFields();
