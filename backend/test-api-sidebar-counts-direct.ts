import axios from 'axios';

async function testSidebarCountsAPI() {
  try {
    console.log('🧪 APIエンドポイントを直接テスト...');
    
    const response = await axios.get('http://localhost:3000/api/sellers/sidebar-counts', {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('\n✅ APIレスポンス取得成功');
    console.log('\n📊 レスポンスデータ:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n🔍 todayCallWithInfoGroups の確認:');
    if (response.data.todayCallWithInfoGroups) {
      console.log('✅ todayCallWithInfoGroups が存在します');
      console.log(`📊 グループ数: ${response.data.todayCallWithInfoGroups.length}`);
      console.log('\n📋 グループ詳細:');
      response.data.todayCallWithInfoGroups.forEach((group: any, index: number) => {
        console.log(`${index + 1}. ${group.label}: ${group.count}件`);
      });
    } else {
      console.log('❌ todayCallWithInfoGroups が存在しません');
      console.log('📋 レスポンスに含まれるキー:', Object.keys(response.data));
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('📊 レスポンスステータス:', error.response.status);
      console.error('📊 レスポンスデータ:', error.response.data);
    }
  }
}

testSidebarCountsAPI();
