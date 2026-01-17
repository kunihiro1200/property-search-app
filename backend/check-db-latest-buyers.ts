/**
 * データベースの最新買主番号を確認
 */
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDbLatestBuyers() {
  console.log('=== データベースの買主状態 ===\n');
  
  // 総数
  const { count } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });
  
  console.log(`総買主数: ${count}`);
  
  // 最新の買主番号を取得
  const { data: latestBuyers, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, phone_number, email, property_number')
    .order('buyer_number', { ascending: false })
    .limit(20);
  
  if (error) {
    console.error('エラー:', error.message);
    return;
  }
  
  console.log('\n最新20件の買主:');
  latestBuyers?.forEach((b, i) => {
    console.log(`  ${i + 1}. 番号: ${b.buyer_number}, 名前: ${b.name || '(未設定)'}, 物件: ${b.property_number || '(未設定)'}`);
  });
  
  // 買主番号 6650-6672 の範囲を確認
  console.log('\n=== 買主番号 6650-6672 の範囲 ===');
  const { data: rangeBuyers } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .gte('buyer_number', '6650')
    .lte('buyer_number', '6672')
    .order('buyer_number', { ascending: true });
  
  if (rangeBuyers && rangeBuyers.length > 0) {
    console.log(`この範囲の買主数: ${rangeBuyers.length}`);
    rangeBuyers.forEach(b => {
      console.log(`  ${b.buyer_number}: ${b.name || '(未設定)'} - ${b.property_number || '(未設定)'}`);
    });
  } else {
    console.log('この範囲の買主は存在しません');
  }
  
  // 特定の買主番号を確認
  console.log('\n=== 対象買主番号の確認 ===');
  const targetNumbers = ['6663', '6660', '6655'];
  
  for (const num of targetNumbers) {
    const { data: buyer, error: buyerError } = await supabase
      .from('buyers')
      .select('buyer_number, name, property_number')
      .eq('buyer_number', num)
      .maybeSingle();
    
    if (buyerError) {
      console.log(`買主番号 ${num}: エラー - ${buyerError.message}`);
    } else if (buyer) {
      console.log(`買主番号 ${num}: 存在 - ${buyer.name || '(未設定)'}`);
    } else {
      console.log(`買主番号 ${num}: 存在しません`);
    }
  }
}

checkDbLatestBuyers().catch(console.error);
