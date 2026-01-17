import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

async function testAPI() {
  console.log('=== 買主6648 API テスト ===\n');

  const baseURL = 'http://localhost:3000';

  try {
    // 1. 買主番号で検索
    console.log('1. 買主番号6648で検索...');
    const searchRes = await axios.get(`${baseURL}/api/buyers`, {
      params: {
        search: '6648',
        limit: 10
      }
    });

    console.log(`   結果数: ${searchRes.data.data.length}`);
    const buyer6648 = searchRes.data.data.find((b: any) => b.buyer_number === '6648');
    
    if (buyer6648) {
      console.log('   ✅ 買主6648が見つかりました');
      console.log(`   ID: ${buyer6648.id}`);
      console.log(`   氏名: ${buyer6648.name}`);
      console.log(`   電話: ${buyer6648.phone_number}`);
      console.log(`   物件番号: ${buyer6648.property_number}`);
    } else {
      console.log('   ❌ 買主6648が見つかりません');
      console.log('   検索結果:');
      searchRes.data.data.forEach((b: any) => {
        console.log(`     - ${b.buyer_number}: ${b.name}`);
      });
    }

    // 2. 全件取得（最新順）
    console.log('\n2. 全件取得（最新10件）...');
    const allRes = await axios.get(`${baseURL}/api/buyers`, {
      params: {
        page: 1,
        limit: 10,
        sortBy: 'db_created_at',
        sortOrder: 'desc'
      }
    });

    console.log(`   総件数: ${allRes.data.total}`);
    console.log(`   取得件数: ${allRes.data.data.length}`);
    
    const found6648 = allRes.data.data.find((b: any) => b.buyer_number === '6648');
    if (found6648) {
      console.log('   ✅ 最新10件に6648が含まれています');
    } else {
      console.log('   ⚠️  最新10件に6648は含まれていません');
      console.log('   最新10件の買主番号:');
      allRes.data.data.forEach((b: any, index: number) => {
        console.log(`     ${index + 1}. ${b.buyer_number}: ${b.name}`);
      });
    }

    // 3. 買主6647も確認
    console.log('\n3. 買主6647も確認...');
    const search6647Res = await axios.get(`${baseURL}/api/buyers`, {
      params: {
        search: '6647',
        limit: 10
      }
    });

    const buyer6647 = search6647Res.data.data.find((b: any) => b.buyer_number === '6647');
    if (buyer6647) {
      console.log('   ✅ 買主6647が見つかりました');
      console.log(`   ID: ${buyer6647.id}`);
      console.log(`   氏名: ${buyer6647.name}`);
      console.log(`   電話: ${buyer6647.phone_number}`);
    } else {
      console.log('   ❌ 買主6647が見つかりません');
    }

    // 4. 統計情報
    console.log('\n4. 統計情報...');
    const statsRes = await axios.get(`${baseURL}/api/buyers/stats`);
    console.log(`   総買主数: ${statsRes.data.total}`);

  } catch (error: any) {
    if (error.response) {
      console.error(`   ❌ APIエラー: ${error.response.status} ${error.response.statusText}`);
      console.error(`   詳細: ${JSON.stringify(error.response.data)}`);
    } else if (error.request) {
      console.error('   ❌ サーバーに接続できません');
      console.error('   バックエンドサーバーが起動しているか確認してください');
    } else {
      console.error(`   ❌ エラー: ${error.message}`);
    }
  }
}

testAPI().catch(console.error);
