import { BuyerCandidateService } from './src/services/BuyerCandidateService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkBuyerCandidates() {
  console.log('=== AA13249の買主候補を取得 ===\n');

  const service = new BuyerCandidateService();
  
  try {
    const result = await service.getCandidatesForProperty('AA13249');
    
    console.log('物件情報:');
    console.log('  物件番号:', result.property.property_number);
    console.log('  種別:', result.property.property_type);
    console.log('  価格:', result.property.sales_price?.toLocaleString(), '円');
    console.log('  配信エリア:', result.property.distribution_areas);
    console.log('  住所:', result.property.address);
    
    console.log('\n買主候補:');
    console.log('  合計:', result.total, '件');
    
    console.log('\n買主一覧:');
    result.candidates.forEach((c, i) => {
      console.log(`  ${i + 1}. ${c.buyer_number} - ${c.name}`);
      console.log(`     最新状況: ${c.latest_status}`);
      console.log(`     希望エリア: ${c.desired_area}`);
      console.log(`     希望種別: ${c.desired_property_type}`);
    });
    
    // 買主1553が含まれているか確認
    const buyer1553 = result.candidates.find(c => c.buyer_number === '1553');
    if (buyer1553) {
      console.log('\n✅ 買主1553が含まれています');
    } else {
      console.log('\n❌ 買主1553が含まれていません');
      console.log('   → バックエンドのログを確認してください');
    }
    
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkBuyerCandidates().catch(console.error);
