// 買主6951のAPIをテスト
import { BuyerService } from './src/services/BuyerService';

async function testBuyer6951() {
  console.log('買主6951のAPIをテスト中...\n');

  const buyerService = new BuyerService();

  try {
    // 1. 買主6951を取得
    console.log('=== 1. 買主6951を取得 ===');
    const buyer = await buyerService.getByBuyerNumber('6951');
    
    if (!buyer) {
      console.log('❌ 買主6951が見つかりません');
      return;
    }
    
    console.log('✅ 買主6951を取得しました');
    console.log('買主番号:', buyer.buyer_number);
    console.log('氏名:', buyer.name);
    console.log('物件番号:', buyer.property_number);
    console.log('');

    // 2. 紐づいた物件を取得（修正後のメソッド）
    console.log('=== 2. 紐づいた物件を取得（修正後） ===');
    console.log('getLinkedProperties("6951")を呼び出し中...');
    
    const properties = await buyerService.getLinkedProperties('6951');
    
    console.log(`取得した物件数: ${properties.length}`);
    console.log('');

    if (properties.length === 0) {
      console.log('❌ 物件が見つかりません');
      console.log('');
      console.log('デバッグ情報:');
      console.log('- buyer.property_number:', buyer.property_number);
      console.log('- 期待される物件番号: AA1949');
    } else {
      console.log('✅ 物件を取得しました');
      properties.forEach((property, index) => {
        console.log(`\n物件 ${index + 1}:`);
        console.log('  物件番号:', property.property_number);
        console.log('  住所:', property.display_address || property.address);
        console.log('  種別:', property.property_type);
        console.log('  価格:', property.price ? `${property.price.toLocaleString()}円` : '未設定');
      });
    }

    console.log('\n=== テスト結果 ===');
    if (properties.length > 0 && properties[0].property_number === 'AA1949') {
      console.log('✅ 修正が正しく動作しています！');
      console.log('✅ 買主6951は物件AA1949に正しく紐づいています');
    } else {
      console.log('❌ 修正が正しく動作していません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testBuyer6951()
  .then(() => {
    console.log('\nテスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('エラー:', error);
    process.exit(1);
  });
