import { BuyerCandidateService } from './src/services/BuyerCandidateService';

async function checkBuyer6941InCandidates() {
  console.log('=== AA13249の買主候補に6941が含まれるか確認 ===\n');

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

    const buyer6941 = result.candidates.find(c => c.buyer_number === '6941');

    if (buyer6941) {
      console.log('\n✅ 買主6941が買主候補に含まれています！');
      console.log('  買主番号:', buyer6941.buyer_number);
      console.log('  氏名:', buyer6941.name);
      console.log('  最新状況:', buyer6941.latest_status);
      console.log('  希望エリア:', buyer6941.desired_area);
      console.log('  希望種別:', buyer6941.desired_property_type);
    } else {
      console.log('\n❌ 買主6941が買主候補に含まれていません');
      console.log('\n買主候補リスト（最初の10件）:');
      result.candidates.slice(0, 10).forEach((c, index) => {
        console.log(`  ${index + 1}. ${c.buyer_number} - ${c.name}`);
      });
    }

  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

checkBuyer6941InCandidates().catch(console.error);
