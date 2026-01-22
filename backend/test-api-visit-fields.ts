import { SellerService } from './src/services/SellerService.supabase';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAPIVisitFields() {
  console.log('=== API経由でAA12903の訪問フィールドをテスト ===\n');

  try {
    const sellerService = new SellerService();

    // AA12903のIDを取得
    const { data: sellers } = await sellerService['table']('sellers')
      .select('id, seller_number')
      .eq('seller_number', 'AA12903')
      .single();

    if (!sellers) {
      console.log('❌ AA12903が見つかりませんでした');
      return;
    }

    console.log('✓ AA12903を発見:', sellers.id);

    // getSellerメソッドを使用してデータを取得
    const seller = await sellerService.getSeller(sellers.id);

    if (!seller) {
      console.log('❌ getSeller()がnullを返しました');
      return;
    }

    console.log('\n=== getSeller()の戻り値 ===');
    console.log('ID:', seller.id);
    console.log('売主番号:', seller.sellerNumber);
    console.log('名前:', seller.name);
    console.log('appointmentDate:', seller.appointmentDate);
    console.log('visitDate:', seller.visitDate);
    console.log('visitTime:', seller.visitTime);
    console.log('visitAssignee:', seller.visitAssignee);
    console.log('visitValuationAcquirer:', seller.visitValuationAcquirer);
    console.log('valuationAssignee:', seller.valuationAssignee);
    console.log('phoneAssignee:', seller.phoneAssignee);

    console.log('\n=== 訪問フィールドの状態 ===');
    const hasVisitDate = !!seller.visitDate;
    const hasVisitTime = !!seller.visitTime;
    const hasVisitAssignee = !!seller.visitAssignee;
    const hasVisitValuationAcquirer = !!seller.visitValuationAcquirer;

    console.log('visitDate 存在:', hasVisitDate ? '✓' : '✗');
    console.log('visitTime 存在:', hasVisitTime ? '✓' : '✗');
    console.log('visitAssignee 存在:', hasVisitAssignee ? '✓' : '✗');
    console.log('visitValuationAcquirer 存在:', hasVisitValuationAcquirer ? '✓' : '✗');

    if (hasVisitDate && hasVisitTime && hasVisitAssignee && hasVisitValuationAcquirer) {
      console.log('\n✅ APIレスポンスにすべての訪問フィールドが含まれています');
      console.log('\n=== 期待される表示 ===');
      if (seller.visitDate) {
        console.log('訪問予定日時:', `${new Date(seller.visitDate).toLocaleDateString('ja-JP', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })} ${seller.visitTime}`);
      }
      console.log('営担:', seller.visitAssignee);
      console.log('訪問査定取得者:', seller.visitValuationAcquirer);
    } else {
      console.log('\n⚠️  APIレスポンスに一部の訪問フィールドが欠けています');
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
    console.error(error.stack);
  }
}

testAPIVisitFields()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
