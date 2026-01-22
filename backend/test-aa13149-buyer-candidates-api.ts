// AA13149の買主候補APIをテスト
import dotenv from 'dotenv';
import { BuyerCandidateService } from './src/services/BuyerCandidateService';

// Load environment variables
dotenv.config();

async function testAPI() {
  console.log('=== AA13149 買主候補API テスト ===\n');

  const service = new BuyerCandidateService();
  const propertyNumber = 'AA13149';

  try {
    console.log(`物件番号: ${propertyNumber}`);
    console.log('APIを呼び出し中...\n');

    const result = await service.getCandidatesForProperty(propertyNumber);

    console.log('✅ API呼び出し成功\n');
    console.log('=== 結果 ===');
    console.log(`候補者数: ${result.total}件`);
    console.log(`\n物件情報:`);
    console.log(`  - 物件番号: ${result.property.property_number}`);
    console.log(`  - 種別: ${result.property.property_type || '(未設定)'}`);
    console.log(`  - 価格: ${result.property.sales_price?.toLocaleString() || '(未設定)'}円`);
    console.log(`  - 配信エリア: ${result.property.distribution_areas || '(未設定)'}`);

    if (result.candidates.length > 0) {
      console.log(`\n=== 候補者リスト（最初の5件） ===`);
      result.candidates.slice(0, 5).forEach((c, i) => {
        console.log(`\n${i + 1}. ${c.buyer_number} - ${c.name || '(名前なし)'}`);
        console.log(`   最新状況: ${c.latest_status || '(未設定)'}`);
        console.log(`   問合せ時確度: ${c.inquiry_confidence || '(未設定)'}`);
        console.log(`   希望エリア: ${c.desired_area || '(未設定)'}`);
        console.log(`   希望種別: ${c.desired_property_type || '(未設定)'}`);
      });
    } else {
      console.log('\n⚠️ 候補者が0件です');
    }

  } catch (error: any) {
    console.error('❌ エラー発生:', error.message);
    console.error('スタックトレース:', error.stack);
  }
}

testAPI();
