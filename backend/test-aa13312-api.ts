/**
 * AA13312のAPIレスポンスを確認
 */
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

async function test() {
  // ローカルAPIを呼び出し
  const response = await fetch('http://localhost:3000/api/sellers?seller_number=AA13312');
  const data = await response.json();
  
  console.log('=== AA13312 APIレスポンス ===\n');
  
  if (data.sellers && data.sellers.length > 0) {
    const seller = data.sellers[0];
    console.log('nextCallDate:', seller.nextCallDate);
    console.log('next_call_date:', seller.next_call_date);
  } else if (data.seller) {
    console.log('nextCallDate:', data.seller.nextCallDate);
    console.log('next_call_date:', data.seller.next_call_date);
  } else {
    console.log('レスポンス:', JSON.stringify(data, null, 2));
  }
}

test().catch(console.error);
