import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyer() {
  const buyerUuid = 'f7490b62-edd4-40ba-bc3f-e71bd0d35ca0';
  
  console.log(`\n=== 買主UUID確認: ${buyerUuid} ===\n`);
  
  // 1. UUIDで買主を検索
  const { data: buyerByUuid, error: uuidError } = await supabase
    .from('buyers')
    .select('*')
    .eq('id', buyerUuid)
    .single();
  
  if (uuidError) {
    console.log('❌ UUIDで買主が見つかりません:', uuidError.message);
  } else {
    console.log('✅ UUIDで買主が見つかりました:');
    console.log(JSON.stringify(buyerByUuid, null, 2));
  }
  
  // 2. 買主番号6448で検索
  const { data: buyerBy6448, error: numberError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6448')
    .single();
  
  if (numberError) {
    console.log('\n❌ 買主番号6448が見つかりません:', numberError.message);
  } else {
    console.log('\n✅ 買主番号6448が見つかりました:');
    console.log(JSON.stringify(buyerBy6448, null, 2));
  }
  
  // 3. 買主番号6448を含む全ての買主を検索
  const { data: allBuyers, error: allError } = await supabase
    .from('buyers')
    .select('id, buyer_number, name, email, phone')
    .ilike('buyer_number', '%6448%');
  
  if (allError) {
    console.log('\n❌ 買主番号6448を含む買主の検索エラー:', allError.message);
  } else {
    console.log('\n✅ 買主番号6448を含む買主:');
    console.log(JSON.stringify(allBuyers, null, 2));
  }
  
  // 4. 関連買主を検索（メールアドレスが一致する買主）
  if (buyerBy6448 && buyerBy6448.email) {
    const { data: relatedByEmail, error: emailError } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, email, phone')
      .eq('email', buyerBy6448.email)
      .neq('id', buyerBy6448.id);
    
    if (emailError) {
      console.log('\n❌ メールアドレスで関連買主の検索エラー:', emailError.message);
    } else {
      console.log('\n✅ メールアドレスで関連買主:');
      console.log(JSON.stringify(relatedByEmail, null, 2));
    }
  }
  
  // 5. 関連買主を検索（電話番号が一致する買主）
  if (buyerBy6448 && buyerBy6448.phone) {
    const { data: relatedByPhone, error: phoneError } = await supabase
      .from('buyers')
      .select('id, buyer_number, name, email, phone')
      .eq('phone', buyerBy6448.phone)
      .neq('id', buyerBy6448.id);
    
    if (phoneError) {
      console.log('\n❌ 電話番号で関連買主の検索エラー:', phoneError.message);
    } else {
      console.log('\n✅ 電話番号で関連買主:');
      console.log(JSON.stringify(relatedByPhone, null, 2));
    }
  }
}

checkBuyer().catch(console.error);
