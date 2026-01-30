import axios from 'axios';

async function testAA13507ApiResponse() {
  console.log('🔍 AA13507のAPIレスポンスをテスト...\n');

  try {
    // 売主番号でIDを取得
    const searchResponse = await axios.get('http://localhost:3000/api/sellers', {
      params: { seller_number: 'AA13507' }
    });

    if (!searchResponse.data || searchResponse.data.length === 0) {
      console.log('❌ AA13507が見つかりません');
      return;
    }

    const sellerId = searchResponse.data[0].id;
    console.log(`✅ 売主ID: ${sellerId}\n`);

    // 詳細データを取得
    const detailResponse = await axios.get(`http://localhost:3000/api/sellers/${sellerId}`);
    const seller = detailResponse.data;

    console.log('📝 APIレスポンス:');
    console.log(`  sellerNumber: ${seller.sellerNumber}`);
    console.log(`  name: ${seller.name}`);
    console.log(`  property.address: ${seller.property?.address || '(undefined)'}`);
    console.log(`  comments: ${seller.comments ? seller.comments.substring(0, 50) + '...' : '(undefined)'}`);
    console.log(`  unreachableStatus: ${seller.unreachableStatus || '(undefined)'}`);
    console.log(`  valuationMethod: ${seller.valuationMethod || '(undefined)'}`);
    console.log(`  visitAssignee: ${seller.visitAssignee || '(undefined)'}`);
    console.log(`  visitValuationAcquirer: ${seller.visitValuationAcquirer || '(undefined)'}`);
    console.log(`  status: ${seller.status || '(undefined)'}`);

    console.log('\n✅ 検証結果:');
    
    const checks = [
      { field: 'property.address', value: seller.property?.address, expected: '大分市田中町1丁目4-13' },
      { field: 'comments', value: seller.comments, expected: 'R1/30' },
      { field: 'unreachableStatus', value: seller.unreachableStatus, expected: '不通' },
      { field: 'valuationMethod', value: seller.valuationMethod, expected: '机上査定（不通）' },
      { field: 'status', value: seller.status, expected: '追客中' },
    ];

    checks.forEach(({ field, value, expected }) => {
      const exists = value && value.includes(expected);
      console.log(`  ${field}: ${exists ? '✅ 正常' : '❌ 未設定'}`);
    });

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンス:', error.response.data);
    }
  }
}

testAA13507ApiResponse();
