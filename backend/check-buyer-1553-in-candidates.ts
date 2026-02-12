import { BuyerCandidateService } from './src/services/BuyerCandidateService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkBuyer1553InCandidates() {
  console.log('=== 買主1553がAA13249の買主候補に含まれているか確認 ===\n');

  const buyerCandidateService = new BuyerCandidateService();
  
  try {
    const result = await buyerCandidateService.getCandidatesForProperty('AA13249');
    
    console.log('買主候補数:', result.total);
    console.log('物件のエリア番号:', result.property.distribution_areas);
    
    // 買主1553が含まれているか確認
    const buyer1553 = result.candidates.find(c => c.buyer_number === '1553');
    
    if (buyer1553) {
      console.log('\n✅ 買主1553は買主候補に含まれています');
      console.log('買主情報:', buyer1553);
    } else {
      console.log('\n❌ 買主1553は買主候補に含まれていません');
      console.log('\n買主候補リスト（最初の10件）:');
      result.candidates.slice(0, 10).forEach((c, index) => {
        console.log(`  ${index + 1}. ${c.buyer_number} - ${c.name}`);
      });
    }
  } catch (error) {
    console.error('エラー:', error);
  }
}

checkBuyer1553InCandidates().catch(console.error);
