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

async function updateBuyer4216DesiredType() {
  console.log('買主番号4216のdesired_property_typeを「土地」に設定中...\n');

  // 現在の値を確認
  const { data: before, error: beforeError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type')
    .eq('buyer_number', '4216')
    .single();

  if (beforeError) {
    console.error('エラー:', beforeError);
    return;
  }

  console.log('変更前:');
  console.log('  買主番号:', before.buyer_number);
  console.log('  氏名:', before.name);
  console.log('  希望種別:', before.desired_property_type || '(未設定)');

  // desired_property_typeを「土地」に設定
  const { error: updateError } = await supabase
    .from('buyers')
    .update({ desired_property_type: '土地' })
    .eq('buyer_number', '4216');

  if (updateError) {
    console.error('更新エラー:', updateError);
    return;
  }

  // 更新後の値を確認
  const { data: after, error: afterError } = await supabase
    .from('buyers')
    .select('buyer_number, name, desired_property_type')
    .eq('buyer_number', '4216')
    .single();

  if (afterError) {
    console.error('エラー:', afterError);
    return;
  }

  console.log('\n変更後:');
  console.log('  買主番号:', after.buyer_number);
  console.log('  氏名:', after.name);
  console.log('  希望種別:', after.desired_property_type);
  console.log('\n✅ 更新完了');
}

updateBuyer4216DesiredType();
