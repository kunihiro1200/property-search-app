/**
 * 訪問予定APIのテスト
 */

async function testVisitScheduledAPI() {
  try {
    const fetch = (await import('node-fetch')).default;
    
    // ローカルAPIをテスト
    const response = await fetch('http://localhost:3000/api/sellers?statusCategory=visitScheduled&page=1&pageSize=10', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response.ok) {
      console.log('Status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
      return;
    }
    
    const data = await response.json() as any;
    console.log('=== visitScheduled API Response ===');
    console.log('Total count:', data.total);
    console.log('Data count:', data.data?.length || 0);
    
    if (data.data && data.data.length > 0) {
      for (let i = 0; i < data.data.length; i++) {
        const seller = data.data[i];
        console.log(`\n[${i + 1}] ${seller.sellerNumber || seller.seller_number}`);
        console.log('  visitDate:', seller.visitDate || seller.visit_date);
        console.log('  visitAssignee:', seller.visitAssignee || seller.visit_assignee);
      }
    } else {
      console.log('No sellers found');
    }
    
    // visitCompletedもテスト
    console.log('\n\n=== visitCompleted API Response ===');
    const response2 = await fetch('http://localhost:3000/api/sellers?statusCategory=visitCompleted&page=1&pageSize=10', {
      headers: {
        'Content-Type': 'application/json',
      }
    });
    
    if (!response2.ok) {
      console.log('Status:', response2.status);
      const text = await response2.text();
      console.log('Response:', text);
      return;
    }
    
    const data2 = await response2.json() as any;
    console.log('Total count:', data2.total);
    console.log('Data count:', data2.data?.length || 0);
    
    if (data2.data && data2.data.length > 0) {
      for (let i = 0; i < Math.min(5, data2.data.length); i++) {
        const seller = data2.data[i];
        console.log(`\n[${i + 1}] ${seller.sellerNumber || seller.seller_number}`);
        console.log('  visitDate:', seller.visitDate || seller.visit_date);
        console.log('  visitAssignee:', seller.visitAssignee || seller.visit_assignee);
      }
    } else {
      console.log('No sellers found');
    }
    
  } catch (error: any) {
    console.error('Error:', error.message);
  }
}

testVisitScheduledAPI();
