import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testApiResponse() {
  try {
    const sellerId = 'dab10d67-54fd-4b04-9f6b-959cbd04e2fc'; // AA13424のUUID
    const apiUrl = `http://localhost:3000/api/sellers/${sellerId}`;
    
    console.log('=== AA13424 APIレスポンステスト ===\n');
    console.log('URL:', apiUrl);
    
    const response = await axios.get(apiUrl);
    const seller = response.data;
    
    console.log('\n=== 基本情報 ===');
    console.log('売主番号:', seller.sellerNumber);
    console.log('名前:', seller.name);
    console.log('ステータス:', seller.status);
    
    console.log('\n=== 訪問フィールド（APIレスポンス） ===');
    console.log('visitAcquisitionDate:', seller.visitAcquisitionDate);
    console.log('visitDate:', seller.visitDate);
    console.log('visitValuationAcquirer:', seller.visitValuationAcquirer);
    console.log('visitAssignee:', seller.visitAssignee);
    
    console.log('\n=== 反響フィールド ===');
    console.log('inquiryYear:', seller.inquiryYear);
    console.log('inquiryDate:', seller.inquiryDate);
    console.log('inquirySite:', seller.inquirySite);
    
    console.log('\n=== 完全なレスポンス（JSON） ===');
    console.log(JSON.stringify(seller, null, 2));
    
    // 訪問フィールドの存在チェック
    console.log('\n=== 訪問フィールド存在チェック ===');
    const hasVisitFields = !!(
      seller.visitAcquisitionDate ||
      seller.visitDate ||
      seller.visitValuationAcquirer ||
      seller.visitAssignee
    );
    
    if (hasVisitFields) {
      console.log('✅ 訪問フィールドが存在します');
    } else {
      console.log('❌ 訪問フィールドが存在しません');
      console.log('   → バックエンドのdecryptSellerメソッドを確認してください');
    }
    
  } catch (error: any) {
    console.error('エラー:', error.message);
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('レスポンス:', error.response.data);
    }
  }
}

testApiResponse();
