import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 明示的に.envファイルのパスを指定
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkBuyers() {
  console.log('=== 買主6647と6648の確認 ===\n');

  // 1. 買主6647を検索
  const { data: buyers6647, error: error6647 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6647');

  console.log('買主6647の検索結果:');
  if (error6647) {
    console.error('エラー:', error6647);
  } else {
    console.log('件数:', buyers6647?.length || 0);
    if (buyers6647 && buyers6647.length > 0) {
      buyers6647.forEach((buyer, index) => {
        console.log(`\n${index + 1}. 買主ID: ${buyer.id}`);
        console.log('   買主番号:', buyer.buyer_number);
        console.log('   名前:', buyer.name);
        console.log('   メール:', buyer.email);
        console.log('   電話:', buyer.phone_number);
        console.log('   物件番号:', buyer.property_number);
      });
    }
  }
  console.log('\n');

  // 2. 買主6648を検索
  const { data: buyers6648, error: error6648 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '6648');

  console.log('買主6648の検索結果:');
  if (error6648) {
    console.error('エラー:', error6648);
  } else {
    console.log('件数:', buyers6648?.length || 0);
    if (buyers6648 && buyers6648.length > 0) {
      buyers6648.forEach((buyer, index) => {
        console.log(`\n${index + 1}. 買主ID: ${buyer.id}`);
        console.log('   買主番号:', buyer.buyer_number);
        console.log('   名前:', buyer.name);
        console.log('   メール:', buyer.email);
        console.log('   電話:', buyer.phone_number);
        console.log('   物件番号:', buyer.property_number);
      });
    }
  }
  console.log('\n');

  // 3. 電話番号09095686931で検索
  const { data: buyersByPhone, error: phoneError } = await supabase
    .from('buyers')
    .select('*')
    .eq('phone_number', '09095686931')
    .order('buyer_number', { ascending: true });

  console.log('電話番号09095686931での検索結果:');
  if (phoneError) {
    console.error('エラー:', phoneError);
  } else {
    console.log('件数:', buyersByPhone?.length || 0);
    if (buyersByPhone && buyersByPhone.length > 0) {
      buyersByPhone.forEach((buyer, index) => {
        console.log(`\n${index + 1}. 買主ID: ${buyer.id}`);
        console.log('   買主番号:', buyer.buyer_number);
        console.log('   名前:', buyer.name);
        console.log('   メール:', buyer.email);
        console.log('   電話:', buyer.phone_number);
        console.log('   物件番号:', buyer.property_number);
      });
    }
  }
  console.log('\n');

  // 4. 全ての買主番号をリスト（6640-6650の範囲）
  const { data: buyersRange, error: rangeError } = await supabase
    .from('buyers')
    .select('buyer_number, name, email, phone_number, property_number')
    .gte('buyer_number', '6640')
    .lte('buyer_number', '6650')
    .order('buyer_number', { ascending: true });

  console.log('買主番号6640-6650の範囲:');
  if (rangeError) {
    console.error('エラー:', rangeError);
  } else {
    console.log('件数:', buyersRange?.length || 0);
    if (buyersRange && buyersRange.length > 0) {
      buyersRange.forEach((buyer) => {
        console.log(`- ${buyer.buyer_number}: ${buyer.name} (${buyer.phone_number}) - 物件: ${buyer.property_number}`);
      });
    }
  }
}

checkBuyers().catch(console.error);
