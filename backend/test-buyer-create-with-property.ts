import { BuyerService } from './src/services/BuyerService';

async function testBuyerCreate() {
  console.log('=== 買主作成テスト（問合せ物件番号あり） ===\n');

  const buyerService = new BuyerService();

  // テストデータ
  const buyerData = {
    name: 'テスト買主',
    phone_number: '090-1234-5678',
    property_number: 'AA12495', // 問合せ物件番号
    inquiry_hearing: '予算：500万円', // 問合せ時ヒアリング
  };

  console.log('作成データ:', buyerData);
  console.log('');

  try {
    const newBuyer = await buyerService.create(buyerData);
    console.log('\n=== 作成結果 ===');
    console.log('買主番号:', newBuyer.buyer_number);
    console.log('氏名:', newBuyer.name);
    console.log('問合せ物件番号:', newBuyer.property_number);
    console.log('問合せ時ヒアリング:', newBuyer.inquiry_hearing);
    console.log('希望種別:', newBuyer.desired_property_type);
    console.log('価格帯（戸建）:', newBuyer.price_range_house);
    console.log('価格帯（マンション）:', newBuyer.price_range_apartment);
    console.log('価格帯（土地）:', newBuyer.price_range_land);
    console.log('希望エリア:', newBuyer.desired_area);
  } catch (error) {
    console.error('エラー:', error);
  }
}

testBuyerCreate().catch(console.error);
