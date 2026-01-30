import axios from 'axios';

async function testAA13508ApiResponse() {
  console.log('🔍 AA13508のAPIレスポンスを確認中...\n');

  try {
    // SellerServiceのAPIエンドポイントを呼び出し
    const response = await axios.get('http://localhost:3000/api/sellers/seller-number/AA13508');
    
    console.log('✅ APIレスポンス:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('売主番号:', response.data.seller_number);
    console.log('名前:', response.data.name || 'なし');
    console.log('物件所在地:', response.data.property_address || 'なし');
    console.log('種別:', response.data.property_type || 'なし');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('査定額1:', response.data.valuation_amount_1 ? `${response.data.valuation_amount_1.toLocaleString()}円` : 'なし');
    console.log('査定額2:', response.data.valuation_amount_2 ? `${response.data.valuation_amount_2.toLocaleString()}円` : 'なし');
    console.log('査定額3:', response.data.valuation_amount_3 ? `${response.data.valuation_amount_3.toLocaleString()}円` : 'なし');
    console.log('査定方法:', response.data.valuation_method || 'なし');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('状況（当社）:', response.data.status || 'なし');
    console.log('不通:', response.data.unreachable_status || response.data.unreachableStatus || 'なし');
    console.log('確度:', response.data.confidence_level || 'なし');
    console.log('コメント:', response.data.comments || 'なし');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('訪問日:', response.data.visit_date || 'なし');
    console.log('営担:', response.data.visit_assignee || 'なし');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    // 査定額が表示されているか確認
    if (!response.data.valuation_amount_1 && !response.data.valuation_amount_2 && !response.data.valuation_amount_3) {
      console.log('❌ 査定額が全てnullです！');
      console.log('⚠️ SellerServiceが査定額を返していない可能性があります');
    } else {
      console.log('✅ 査定額が正しく返されています');
    }

  } catch (error: any) {
    console.error('❌ APIエラー:', error.message);
    if (error.response) {
      console.error('ステータスコード:', error.response.status);
      console.error('レスポンス:', error.response.data);
    }
  }
}

testAA13508ApiResponse();
