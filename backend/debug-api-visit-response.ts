/**
 * APIレスポンスの訪問予定/訪問済みデータを確認
 */

import axios from 'axios';

const API_BASE_URL = 'http://localhost:3000';

async function main() {
  console.log('=== APIレスポンスの訪問予定/訪問済みデータ確認 ===');
  console.log('');
  
  try {
    // 訪問予定を取得
    console.log('--- 訪問予定（visitScheduled） ---');
    const visitScheduledResponse = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 100,
        statusCategory: 'visitScheduled',
      },
    });
    
    const visitScheduledData = visitScheduledResponse.data;
    console.log('レスポンス構造:', Object.keys(visitScheduledData));
    console.log('data配列の長さ:', visitScheduledData.data?.length || 0);
    console.log('total:', visitScheduledData.total);
    
    if (visitScheduledData.data && visitScheduledData.data.length > 0) {
      console.log('');
      console.log('訪問予定の売主:');
      visitScheduledData.data.forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber || seller.seller_number}:`);
        console.log(`    visitDate = ${seller.visitDate}`);
        console.log(`    visit_date = ${seller.visit_date}`);
        console.log(`    visitAssignee = ${seller.visitAssignee}`);
        console.log(`    visit_assignee = ${seller.visit_assignee}`);
      });
    } else {
      console.log('⚠️ 訪問予定の売主が0件です');
    }
    
    console.log('');
    
    // 訪問済みを取得
    console.log('--- 訪問済み（visitCompleted） ---');
    const visitCompletedResponse = await axios.get(`${API_BASE_URL}/api/sellers`, {
      params: {
        page: 1,
        pageSize: 100,
        statusCategory: 'visitCompleted',
      },
    });
    
    const visitCompletedData = visitCompletedResponse.data;
    console.log('レスポンス構造:', Object.keys(visitCompletedData));
    console.log('data配列の長さ:', visitCompletedData.data?.length || 0);
    console.log('total:', visitCompletedData.total);
    
    if (visitCompletedData.data && visitCompletedData.data.length > 0) {
      console.log('');
      console.log('訪問済みの売主（最初の5件）:');
      visitCompletedData.data.slice(0, 5).forEach((seller: any) => {
        console.log(`  ${seller.sellerNumber || seller.seller_number}:`);
        console.log(`    visitDate = ${seller.visitDate}`);
        console.log(`    visit_date = ${seller.visit_date}`);
        console.log(`    visitAssignee = ${seller.visitAssignee}`);
        console.log(`    visit_assignee = ${seller.visit_assignee}`);
      });
    } else {
      console.log('⚠️ 訪問済みの売主が0件です');
    }
    
  } catch (error: any) {
    console.error('APIエラー:', error.message);
    if (error.response) {
      console.error('ステータス:', error.response.status);
      console.error('データ:', error.response.data);
    }
  }
}

main().catch(console.error);
