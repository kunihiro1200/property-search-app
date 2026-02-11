import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .env.localファイルを読み込む
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('環境変数が設定されていません');
  console.error('SUPABASE_URL:', supabaseUrl ? '設定済み' : '未設定');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '設定済み' : '未設定');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuyer4216() {
  console.log('買主番号4216のdesired_property_typeを確認中...\n');

  const { data: buyer, error } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type, inquiry_hearing')
    .eq('buyer_number', '4216')
    .single();

  if (error) {
    console.error('エラー:', error);
    return;
  }

  if (!buyer) {
    console.log('買主番号4216が見つかりません');
    return;
  }

  console.log('買主情報:');
  console.log('  買主番号:', buyer.buyer_number);
  console.log('  氏名:', buyer.name);
  console.log('  希望種別:', buyer.desired_property_type || '(未設定)');
  console.log('  問合せ時ヒアリング:', buyer.inquiry_hearing || '(未設定)');
}

checkBuyer4216();
