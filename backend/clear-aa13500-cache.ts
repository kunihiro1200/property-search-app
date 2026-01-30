import api from './src/services/api';

async function clearAA13500Cache() {
  try {
    console.log('=== AA13500のキャッシュをクリア ===');

    // AA13500のIDを取得
    const sellerResponse = await api.get('/api/sellers?seller_number=AA13500');
    const seller = sellerResponse.data.find((s: any) => s.sellerNumber === 'AA13500');

    if (!seller) {
      console.log('⚠️ AA13500が見つかりません');
      return;
    }

    console.log('✅ AA13500のID:', seller.id);

    // キャッシュをクリア
    await api.delete(`/cache/seller/${seller.id}`);
    console.log('✅ キャッシュをクリアしました');

    // 最新データを取得
    const freshData = await api.get(`/api/sellers/${seller.id}`);
    console.log('📊 最新データ:');
    console.log('   査定方法:', freshData.data.valuationMethod);
    console.log('   郵送ステータス:', freshData.data.mailingStatus);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

clearAA13500Cache();
