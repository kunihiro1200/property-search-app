import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testAA13423API() {
  const targetSellerNumber = 'AA13423';
  
  console.log(`🧪 ${targetSellerNumber}のAPI応答をテスト\n`);

  try {
    // 売主リストAPIを呼び出し
    const response = await axios.get('http://localhost:3000/api/sellers', {
      headers: {
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
      }
    });

    const sellers = response.data;
    const targetSeller = sellers.find((s: any) => s.sellerNumber === targetSellerNumber);

    if (!targetSeller) {
      console.error(`❌ APIレスポンスに${targetSellerNumber}が見つかりません`);
      return;
    }

    console.log(`✅ ${targetSellerNumber}のAPIレスポンス:`);
    console.log(`   sellerNumber: ${targetSeller.sellerNumber}`);
    console.log(`   inquiryYear: ${targetSeller.inquiryYear || '(undefined)'}`);
    console.log(`   inquirySite: ${targetSeller.inquirySite || '(undefined)'}`);
    console.log(`   site: ${targetSeller.site || '(undefined)'}`);
    console.log('');

    // 期待値チェック
    const hasInquiryYear = targetSeller.inquiryYear === 2026;
    const hasInquirySite = targetSeller.inquirySite === 'す';
    const hasSite = targetSeller.site === 'す';

    console.log('📊 検証結果:');
    console.log(`   inquiryYear === 2026: ${hasInquiryYear ? '✅' : '❌'}`);
    console.log(`   inquirySite === 'す': ${hasInquirySite ? '✅' : '❌'}`);
    console.log(`   site === 'す' (後方互換): ${hasSite ? '✅' : '❌'}`);
    console.log('');

    if (hasInquiryYear && hasInquirySite && hasSite) {
      console.log('🎉 すべてのフィールドが正しく返されています！');
      console.log('');
      console.log('次のステップ:');
      console.log('1. ブラウザで売主リストページを開く: http://localhost:5174/sellers');
      console.log('2. ページをリロード（F5）');
      console.log(`3. ${targetSellerNumber}の行を探す`);
      console.log('4. 「反響年」と「サイト」列にデータが表示されているか確認');
    } else {
      console.log('❌ 一部のフィールドが正しく返されていません');
    }

  } catch (error: any) {
    console.error('❌ APIエラー:', error.message);
    if (error.response) {
      console.error('   ステータス:', error.response.status);
      console.error('   データ:', error.response.data);
    }
  }
}

testAA13423API()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
