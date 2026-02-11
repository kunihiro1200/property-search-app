import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuyer4216Property() {
  console.log('買主番号4216の初回問い合わせ物件を確認中...\n');

  // 買主情報を取得
  const { data: buyer, error: buyerError } = await supabase
    .from('buyers')
    .select('buyer_number, name, property_number')
    .eq('buyer_number', '4216')
    .single();

  if (buyerError) {
    console.error('買主取得エラー:', buyerError);
    return;
  }

  if (!buyer) {
    console.log('買主番号4216が見つかりません');
    return;
  }

  console.log('買主情報:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  初回問い合わせ物件番号:', buyer.property_number || '(未設定)');

  if (!buyer.property_number) {
    console.log('\n初回問い合わせ物件が設定されていません');
    return;
  }

  // 物件情報を取得
  const { data: property, error: propertyError } = await supabase
    .from('property_listings')
    .select('property_number, address, property_type')
    .eq('property_number', buyer.property_number)
    .single();

  if (propertyError) {
    console.error('物件取得エラー:', propertyError);
    return;
  }

  if (!property) {
    console.log('\n物件が見つかりません');
    return;
  }

  console.log('\n初回問い合わせ物件:');
  console.log('  物件番号:', property.property_number);
  console.log('  所在地:', property.address);
  console.log('  物件種別:', property.property_type);
}

checkBuyer4216Property();
