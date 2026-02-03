import axios from 'axios';

async function testTodayCallAssignedAPI() {
  console.log('🧪 Testing todayCallAssigned API with visitStatus parameter\n');

  // テスト1: 訪問予定の当日TEL（未当日TEL）
  console.log('📋 Test 1: 訪問予定の当日TEL（未当日TEL）');
  console.log('   statusCategory=todayCallAssigned');
  console.log('   visitAssignee=U');
  console.log('   visitStatus=scheduled\n');

  try {
    const response1 = await axios.get('http://localhost:3000/api/sellers', {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'U',
        visitStatus: 'scheduled',
        page: 1,
        pageSize: 50,
      },
    });

    console.log(`✅ Response received: ${response1.data.sellers.length} sellers`);
    console.log(`   Total: ${response1.data.total}`);
    
    if (response1.data.sellers.length > 0) {
      const seller = response1.data.sellers[0];
      console.log(`\n   Example seller:`);
      console.log(`   - 売主番号: ${seller.sellerNumber}`);
      console.log(`   - 営担: ${seller.visitAssignee}`);
      console.log(`   - 訪問日: ${seller.visitDate}`);
      console.log(`   - 次電日: ${seller.nextCallDate}`);
      console.log(`   - 状況: ${seller.status}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // テスト2: 訪問済みの当日TEL（済当日TEL）
  console.log('📋 Test 2: 訪問済みの当日TEL（済当日TEL）');
  console.log('   statusCategory=todayCallAssigned');
  console.log('   visitAssignee=U');
  console.log('   visitStatus=completed\n');

  try {
    const response2 = await axios.get('http://localhost:3000/api/sellers', {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'U',
        visitStatus: 'completed',
        page: 1,
        pageSize: 50,
      },
    });

    console.log(`✅ Response received: ${response2.data.sellers.length} sellers`);
    console.log(`   Total: ${response2.data.total}`);
    
    if (response2.data.sellers.length > 0) {
      const seller = response2.data.sellers[0];
      console.log(`\n   Example seller:`);
      console.log(`   - 売主番号: ${seller.sellerNumber}`);
      console.log(`   - 営担: ${seller.visitAssignee}`);
      console.log(`   - 訪問日: ${seller.visitDate}`);
      console.log(`   - 次電日: ${seller.nextCallDate}`);
      console.log(`   - 状況: ${seller.status}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // テスト3: visitStatusなし（全ての当日TEL）
  console.log('📋 Test 3: visitStatusなし（全ての当日TEL）');
  console.log('   statusCategory=todayCallAssigned');
  console.log('   visitAssignee=U');
  console.log('   visitStatus=undefined\n');

  try {
    const response3 = await axios.get('http://localhost:3000/api/sellers', {
      params: {
        statusCategory: 'todayCallAssigned',
        visitAssignee: 'U',
        page: 1,
        pageSize: 50,
      },
    });

    console.log(`✅ Response received: ${response3.data.sellers.length} sellers`);
    console.log(`   Total: ${response3.data.total}`);
    
    if (response3.data.sellers.length > 0) {
      const seller = response3.data.sellers[0];
      console.log(`\n   Example seller:`);
      console.log(`   - 売主番号: ${seller.sellerNumber}`);
      console.log(`   - 営担: ${seller.visitAssignee}`);
      console.log(`   - 訪問日: ${seller.visitDate}`);
      console.log(`   - 次電日: ${seller.nextCallDate}`);
      console.log(`   - 状況: ${seller.status}`);
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testTodayCallAssignedAPI().catch(console.error);
