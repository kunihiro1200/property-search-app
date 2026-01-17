import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkBuyer2064() {
  console.log('=== 買主2064の存在確認 ===\n');

  // 買主番号で検索
  const { data: byNumber, error: numberError } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', 2064);

  console.log('買主番号2064での検索結果:');
  if (numberError) {
    console.error('エラー:', numberError);
  } else {
    console.log(`見つかった件数: ${byNumber?.length || 0}`);
    if (byNumber && byNumber.length > 0) {
      console.log('データ:', JSON.stringify(byNumber[0], null, 2));
    }
  }

  // メールアドレスで検索
  console.log('\nメールアドレス kouten0909@icloud.com での検索結果:');
  const { data: byEmail, error: emailError } = await supabase
    .from('buyers')
    .select('*')
    .eq('email', 'kouten0909@icloud.com');

  if (emailError) {
    console.error('エラー:', emailError);
  } else {
    console.log(`見つかった件数: ${byEmail?.length || 0}`);
    if (byEmail && byEmail.length > 0) {
      console.log('データ:', JSON.stringify(byEmail[0], null, 2));
    }
  }

  // 全買主数を確認
  console.log('\n全買主数:');
  const { count, error: countError } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('エラー:', countError);
  } else {
    console.log(`総買主数: ${count}`);
  }

  // 買主番号が2000番台の買主を確認
  console.log('\n買主番号2000番台の買主:');
  const { data: buyers2000s, error: buyers2000sError } = await supabase
    .from('buyers')
    .select('buyer_number, email, name')
    .gte('buyer_number', 2000)
    .lt('buyer_number', 2100)
    .order('buyer_number');

  if (buyers2000sError) {
    console.error('エラー:', buyers2000sError);
  } else {
    console.log(`見つかった件数: ${buyers2000s?.length || 0}`);
    if (buyers2000s && buyers2000s.length > 0) {
      buyers2000s.forEach(b => {
        console.log(`  ${b.buyer_number}: ${b.email} (${b.name || '名前なし'})`);
      });
    }
  }
}

checkBuyer2064().catch(console.error);
