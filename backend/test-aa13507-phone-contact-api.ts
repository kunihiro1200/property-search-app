import axios from 'axios';

async function testAA13507PhoneContactAPI() {
  console.log('🧪 AA13507のAPIレスポンスをテスト中...\n');

  try {
    // 1. 売主番号でAPIを呼び出し
    console.log('📋 ステップ1: APIを呼び出し...');
    const response = await axios.get('http://localhost:3000/api/sellers/by-number/AA13507');

    if (response.status !== 200) {
      console.log('❌ APIエラー:', response.status);
      return;
    }

    const seller = response.data;

    console.log('✅ APIレスポンスを取得しました\n');

    // 2. レスポンスを確認
    console.log('📊 APIレスポンス:');
    console.log('売主番号:', seller.sellerNumber);
    console.log('名前:', seller.name);
    console.log('電話担当（任意）:', seller.phoneContactPerson || '【空】');
    console.log('連絡取りやすい日、時間帯:', seller.preferredContactTime || '【空】');
    console.log('連絡方法:', seller.contactMethod || '【空】');
    console.log('');

    // 3. 判定
    if (seller.phoneContactPerson) {
      console.log('✅ phone_contact_personが正しく返されています');
      console.log(`   値: "${seller.phoneContactPerson}"`);
    } else {
      console.log('❌ phone_contact_personが返されていません');
    }

  } catch (error: any) {
    if (error.response) {
      console.error('❌ APIエラー:', error.response.status, error.response.data);
    } else {
      console.error('❌ エラー:', error.message);
    }
  }
}

testAA13507PhoneContactAPI();
