/**
 * APIエンドポイントの訪問予定/訪問済みカテゴリをテスト
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
dotenv.config({ path: '.env.local' });

async function main() {
  const baseUrl = 'http://localhost:3000';
  
  console.log('=== APIエンドポイントの訪問予定/訪問済みカテゴリをテスト ===');
  console.log('');
  
  // 認証トークンを取得（テスト用）
  // 実際のテストでは、ログイン済みのトークンを使用する必要があります
  
  try {
    // 訪問予定を取得
    console.log('--- 訪問予定（visitScheduled） ---');
    const visitScheduledResponse = await fetch(`${baseUrl}/api/sellers?page=1&pageSize=100&statusCategory=visitScheduled`);
    
    if (!visitScheduledResponse.ok) {
      console.log('エラー:', visitScheduledResponse.status, visitScheduledResponse.statusText);
      const errorText = await visitScheduledResponse.text();
      console.log('エラー詳細:', errorText);
    } else {
      const visitScheduledData = await visitScheduledResponse.json();
      console.log('total:', visitScheduledData.total);
      console.log('data配列の長さ:', visitScheduledData.data?.length || 0);
      
      if (visitScheduledData.data && visitScheduledData.data.length > 0) {
        console.log('');
        console.log('訪問予定の売主:');
        visitScheduledData.data.forEach((seller: any) => {
          console.log(`  ${seller.sellerNumber}:`);
          console.log(`    visitDate = ${seller.visitDate}`);
          console.log(`    visitDate type = ${typeof seller.visitDate}`);
          console.log(`    visitAssignee = ${seller.visitAssignee}`);
        });
      }
    }
    
    console.log('');
    
    // 訪問済みを取得
    console.log('--- 訪問済み（visitCompleted） ---');
    const visitCompletedResponse = await fetch(`${baseUrl}/api/sellers?page=1&pageSize=100&statusCategory=visitCompleted`);
    
    if (!visitCompletedResponse.ok) {
      console.log('エラー:', visitCompletedResponse.status, visitCompletedResponse.statusText);
      const errorText = await visitCompletedResponse.text();
      console.log('エラー詳細:', errorText);
    } else {
      const visitCompletedData = await visitCompletedResponse.json();
      console.log('total:', visitCompletedData.total);
      console.log('data配列の長さ:', visitCompletedData.data?.length || 0);
      
      if (visitCompletedData.data && visitCompletedData.data.length > 0) {
        console.log('');
        console.log('訪問済みの売主（最初の5件）:');
        visitCompletedData.data.slice(0, 5).forEach((seller: any) => {
          console.log(`  ${seller.sellerNumber}:`);
          console.log(`    visitDate = ${seller.visitDate}`);
          console.log(`    visitDate type = ${typeof seller.visitDate}`);
          console.log(`    visitAssignee = ${seller.visitAssignee}`);
        });
      }
    }
    
  } catch (error: any) {
    console.error('エラー:', error.message);
  }
}

main().catch(console.error);
