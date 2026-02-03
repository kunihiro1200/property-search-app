import { SellerService } from './src/services/SellerService.supabase';

async function testTodayCallAssignedFiltering() {
  console.log('🧪 Testing todayCallAssigned filtering...\n');

  const sellerService = new SellerService();

  try {
    // 1. サイドバーカウントを取得
    console.log('📊 Step 1: Get sidebar counts');
    const counts = await sellerService.getSidebarCounts();
    console.log('todayCallAssigned:', counts.todayCallAssigned);
    console.log('todayCallAssignedByAssignee:', counts.todayCallAssignedByAssignee);
    console.log('');

    // 2. 訪問済み(U)の売主を取得
    console.log('📊 Step 2: List sellers for visitCompleted(U)');
    const visitCompletedU = await sellerService.listSellers({
      statusCategory: 'visitCompleted',
      visitAssignee: 'U',
      page: 1,
      pageSize: 100,
    });
    console.log(`Found ${visitCompletedU?.sellers?.length || 0} sellers for visitCompleted(U)`);
    if (visitCompletedU?.sellers) {
      visitCompletedU.sellers.forEach(s => {
        console.log(`  - ${s.sellerNumber}: 営担=${s.visitAssignee}, 訪問日=${s.visitDate}, 次電日=${s.nextCallDate}, 状況=${s.status}`);
      });
    }
    console.log('');

    // 3. 当日TEL(U)の売主を取得
    console.log('📊 Step 3: List sellers for todayCallAssigned(U)');
    const todayCallU = await sellerService.listSellers({
      statusCategory: 'todayCallAssigned',
      visitAssignee: 'U',
      page: 1,
      pageSize: 100,
    });
    console.log(`Found ${todayCallU?.sellers?.length || 0} sellers for todayCallAssigned(U)`);
    if (todayCallU?.sellers) {
      todayCallU.sellers.forEach(s => {
        console.log(`  - ${s.sellerNumber}: 営担=${s.visitAssignee}, 訪問日=${s.visitDate}, 次電日=${s.nextCallDate}, 状況=${s.status}`);
      });
    }
    console.log('');

    // 4. AA13533を確認
    console.log('📊 Step 4: Check AA13533 specifically');
    const aa13533List = await sellerService.listSellers({
      page: 1,
      pageSize: 2000,
    });
    const aa13533 = aa13533List.sellers.find(s => s.sellerNumber === 'AA13533');
    if (aa13533) {
      console.log('AA13533 data:');
      console.log(`  - 営担: ${aa13533.visitAssignee}`);
      console.log(`  - 訪問日: ${aa13533.visitDate}`);
      console.log(`  - 次電日: ${aa13533.nextCallDate}`);
      console.log(`  - 状況: ${aa13533.status}`);
      console.log(`  - 不通: ${aa13533.unreachableStatus}`);
      
      // AA13533が訪問予定(U)に含まれるか確認
      const visitScheduledU = await sellerService.listSellers({
        statusCategory: 'visitScheduled',
        visitAssignee: 'U',
        page: 1,
        pageSize: 100,
      });
      const isInVisitScheduled = visitScheduledU?.sellers?.some(s => s.sellerNumber === 'AA13533') || false;
      console.log(`  - In visitScheduled(U): ${isInVisitScheduled}`);
      
      // AA13533が当日TEL(U)に含まれるか確認
      const isInTodayCall = todayCallU?.sellers?.some(s => s.sellerNumber === 'AA13533') || false;
      console.log(`  - In todayCallAssigned(U): ${isInTodayCall}`);
    } else {
      console.log('❌ AA13533 not found');
    }

    console.log('\n✅ Test completed');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testTodayCallAssignedFiltering();
