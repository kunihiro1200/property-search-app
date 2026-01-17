import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function investigateBuyer2064Sync() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  console.log('=== 買主番号2064の同期状況を調査 ===\n');

  // 1. データベースに買主番号2064が存在するか確認
  console.log('1. データベースで買主番号2064を検索...');
  const { data: buyer2064, error: error2064 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '2064')
    .single();

  if (error2064) {
    console.log('❌ 買主番号2064は存在しません');
    console.log('エラー:', error2064.message);
  } else {
    console.log('✓ 買主番号2064が見つかりました:');
    console.log(JSON.stringify(buyer2064, null, 2));
  }

  // 2. 買主番号1811を確認
  console.log('\n2. データベースで買主番号1811を検索...');
  const { data: buyer1811, error: error1811 } = await supabase
    .from('buyers')
    .select('*')
    .eq('buyer_number', '1811')
    .single();

  if (error1811) {
    console.log('❌ 買主番号1811は存在しません');
  } else {
    console.log('✓ 買主番号1811が見つかりました:');
    console.log(`  買主番号: ${buyer1811.buyer_number}`);
    console.log(`  氏名: ${buyer1811.name}`);
    console.log(`  メール: ${buyer1811.email}`);
    console.log(`  受付日: ${buyer1811.reception_date}`);
    console.log(`  同期日時: ${buyer1811.synced_at}`);
  }

  // 3. メールアドレスで検索
  console.log('\n3. メールアドレス kouten0909@icloud.com で検索...');
  const { data: buyersByEmail, error: errorEmail } = await supabase
    .from('buyers')
    .select('buyer_number, name, email, reception_date, synced_at')
    .eq('email', 'kouten0909@icloud.com')
    .order('buyer_number', { ascending: true });

  if (errorEmail) {
    console.log('エラー:', errorEmail.message);
  } else {
    console.log(`見つかった買主: ${buyersByEmail?.length || 0}件`);
    buyersByEmail?.forEach(buyer => {
      console.log(`  - 買主番号${buyer.buyer_number}: ${buyer.name} (受付日: ${buyer.reception_date})`);
    });
  }

  // 4. 買主番号2000-2100の範囲を確認
  console.log('\n4. 買主番号2000-2100の範囲を確認...');
  const { data: buyersRange, error: errorRange } = await supabase
    .from('buyers')
    .select('buyer_number, name, reception_date')
    .gte('buyer_number', '2000')
    .lte('buyer_number', '2100')
    .order('buyer_number', { ascending: true });

  if (errorRange) {
    console.log('エラー:', errorRange.message);
  } else {
    console.log(`見つかった買主: ${buyersRange?.length || 0}件`);
    
    // 2064の前後を表示
    const index2064 = buyersRange?.findIndex(b => b.buyer_number === '2064');
    if (index2064 !== undefined && index2064 >= 0) {
      console.log('\n買主番号2064が見つかりました！');
    } else {
      console.log('\n買主番号2064の前後:');
      const nearby = buyersRange?.filter(b => {
        const num = parseInt(b.buyer_number);
        return num >= 2060 && num <= 2070;
      });
      nearby?.forEach(buyer => {
        console.log(`  - 買主番号${buyer.buyer_number}: ${buyer.name} (受付日: ${buyer.reception_date})`);
      });
    }
  }

  // 5. 同期ログを確認（もし存在すれば）
  console.log('\n5. 同期ログを確認...');
  const { data: syncLogs, error: errorLogs } = await supabase
    .from('sync_logs')
    .select('*')
    .eq('table_name', 'buyers')
    .order('created_at', { ascending: false })
    .limit(5);

  if (errorLogs) {
    console.log('同期ログテーブルが存在しないか、エラーが発生しました');
  } else if (syncLogs && syncLogs.length > 0) {
    console.log(`最新の同期ログ ${syncLogs.length}件:`);
    syncLogs.forEach(log => {
      console.log(`  - ${log.created_at}: ${log.status} (${log.records_processed}件処理)`);
      if (log.error_message) {
        console.log(`    エラー: ${log.error_message}`);
      }
    });
  } else {
    console.log('同期ログが見つかりませんでした');
  }

  // 6. 総買主数を確認
  console.log('\n6. データベースの総買主数を確認...');
  const { count, error: errorCount } = await supabase
    .from('buyers')
    .select('*', { count: 'exact', head: true });

  if (errorCount) {
    console.log('エラー:', errorCount.message);
  } else {
    console.log(`総買主数: ${count}件`);
  }
}

investigateBuyer2064Sync().catch(console.error);
