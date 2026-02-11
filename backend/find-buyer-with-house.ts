import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を先に読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findBuyerWithHouse() {
  console.log('戸建の買主を検索中...\n');

  // 戸建の物件を取得
  const { data: properties, error: propertiesError } = await supabase
    .from('property_listings')
    .select('property_number, address, property_type')
    .ilike('property_type', '%戸建%')
    .limit(10);

  if (propertiesError) {
    console.error('物件取得エラー:', propertiesError);
    return;
  }

  if (!properties || properties.length === 0) {
    console.log('戸建の物件が見つかりません');
    return;
  }

  console.log('戸建の物件:', properties.length, '件');

  // 各物件に対して買主を検索
  for (const property of properties) {
    const { data: buyers, error: buyersError } = await supabase
      .from('buyers')
      .select('buyer_number, name, desired_property_type, inquiry_hearing')
      .eq('property_number', property.property_number)
      .limit(1);

    if (buyersError) {
      console.error('買主取得エラー:', buyersError);
      continue;
    }

    if (buyers && buyers.length > 0) {
      const buyer = buyers[0];
      console.log('\n戸建の買主が見つかりました:');
      console.log('  買主番号:', buyer.buyer_number);
      console.log('  氏名:', buyer.name);
      console.log('  希望種別:', buyer.desired_property_type || '(未設定)');
      console.log('  初回問い合わせ物件:', property.property_number);
      console.log('  物件種別:', property.property_type);
      console.log('  問合せ時ヒアリング:', buyer.inquiry_hearing || '(未設定)');
      return;
    }
  }

  console.log('\n戸建の買主が見つかりませんでした');
}

findBuyerWithHouse();
