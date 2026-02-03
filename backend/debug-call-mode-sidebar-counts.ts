import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function debugCallModeSidebarCounts() {
  console.log('=== 通話モードページのサイドバーカウントAPIをデバッグ ===\n');
  
  try {
    // サイドバーカウントAPIを呼び出し
    const response = await axios.get(`${API_BASE_URL}/api/sellers/sidebar-counts`);
    
    console.log('✅ APIレスポンス取得成功\n');
    console.log('📊 レスポンス全体:');
    console.log(JSON.stringify(response.data, null, 2));
    
    console.log('\n=== todayCallWithInfoGroupsの詳細 ===');
    const groups = response.data.todayCallWithInfoGroups;
    
    if (!groups) {
      console.log('❌ todayCallWithInfoGroupsが存在しません');
    } else if (groups.length === 0) {
      console.log('⚠️ todayCallWithInfoGroupsが空配列です');
    } else {
      console.log(`✅ todayCallWithInfoGroupsに${groups.length}件のグループがあります:`);
      groups.forEach((group: any, index: number) => {
        console.log(`\n  グループ${index + 1}:`);
        console.log(`    label: ${group.label}`);
        console.log(`    count: ${group.count}`);
        console.log(`    sellers: ${group.sellers ? `${group.sellers.length}件` : 'なし'}`);
      });
    }
    
    console.log('\n=== 当日TEL（内容）の件数 ===');
    console.log(`todayCallWithInfo: ${response.data.todayCallWithInfo}`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.response) {
      console.error('レスポンスステータス:', error.response.status);
      console.error('レスポンスデータ:', error.response.data);
    }
  }
}

debugCallModeSidebarCounts();
