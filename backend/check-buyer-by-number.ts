// 買主番号で買主を検索するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyerByNumber() {
  const buyerNumber = 'BY_R1UikR1lpuf7x2';
  
  console.log(`\n=== 買主番号 ${buyerNumber} を検索 ===\n`);
  
  // 完全一致検索
  const { data: exactMatch, error: exactError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, phone_number, email')
    .eq('buyer_number', buyerNumber)
    .single();
  
  if (exactError) {
    console.log('完全一致検索エラー:', exactError.message);
  } else {
    console.log('完全一致結果:', exactMatch);
  }
  
  // 部分一致検索
  const { data: partialMatch, error: partialError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name')
    .ilike('buyer_number', `%R1UikR1lpuf7x2%`)
    .limit(5);
  
  if (partialError) {
    console.log('部分一致検索エラー:', partialError.message);
  } else {
    console.log('\n部分一致結果:', partialMatch);
  }
  
  // BY_で始まる買主番号を検索
  const { data: byPrefixMatch, error: byPrefixError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name')
    .ilike('buyer_number', 'BY_%')
    .limit(10);
  
  if (byPrefixError) {
    console.log('BY_プレフィックス検索エラー:', byPrefixError.message);
  } else {
    console.log('\nBY_で始まる買主番号:', byPrefixMatch);
  }
}

checkBuyerByNumber().catch(console.error);
