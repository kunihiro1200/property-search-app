/**
 * 買主番号6978がデータベースに存在するか確認するスクリプト
 */

// 環境変数を最初に読み込み
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

async function checkBuyer() {
  console.log('[check-buyer] Starting...');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  
  // 買主番号6978を検索
  console.log('[check-buyer] Searching for buyer_number=6978...');
  const { data, error } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6978');
  
  if (error) {
    console.error('[check-buyer] Error:', error);
    process.exit(1);
  }
  
  console.log('[check-buyer] Found buyers:', data?.length || 0);
  
  if (data && data.length > 0) {
    console.log('[check-buyer] Buyer data:');
    data.forEach((buyer, index) => {
      console.log(`\n${index + 1}. Buyer:`, {
        buyer_number: buyer.buyer_number,
        name: buyer.name,
        phone_number: buyer.phone_number,
        email: buyer.email,
        created_at: buyer.created_at,
      });
    });
  } else {
    console.log('[check-buyer] No buyers found with buyer_number=6978');
    
    // 最新の買主番号を確認
    console.log('\n[check-buyer] Checking latest buyer numbers...');
    const { data: latestBuyers } = await supabase
      .from('buyers')
      .select('buyer_number, name, created_at')
      .order('created_at', { ascending: false })
      .limit(10);
    
    console.log('[check-buyer] Latest 10 buyers:');
    latestBuyers?.forEach((buyer, index) => {
      console.log(`${index + 1}. ${buyer.buyer_number} - ${buyer.name} (${buyer.created_at})`);
    });
  }
  
  process.exit(0);
}

checkBuyer();
