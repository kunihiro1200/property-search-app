import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const PROPERTY_NUMBER = 'AA12495';

async function main() {
  console.log('🔍 AA12495のCWの方へ依頼メールフィールドを確認します...\n');

  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // データベースからデータを取得
    const { data, error } = await supabase
      .from('work_tasks')
      .select('property_number, cw_request_email_site, cw_request_email_floor_plan, cw_request_email_2f_above')
      .eq('property_number', PROPERTY_NUMBER)
      .single();

    if (error) {
      console.error('❌ エラー:', error.message);
      return;
    }

    if (!data) {
      console.log('❌ データが見つかりません');
      return;
    }

    console.log('📊 データベースの値:');
    console.log(`   CWの方へ依頼メール（サイト登録）: "${data.cw_request_email_site}"`);
    console.log(`   CWの方へ依頼メール（間取り、区画図）: "${data.cw_request_email_floor_plan}"`);
    console.log(`   CWの方へ依頼メール（2階以上）: "${data.cw_request_email_2f_above}"`);

    console.log('\n📝 期待される表示:');
    if (data.cw_request_email_site === 'TRUE') {
      console.log('   サイト登録: 送信1ボタンが押された状態');
    } else if (data.cw_request_email_site === 'FALSE') {
      console.log('   サイト登録: 送信2ボタンが押された状態');
    } else {
      console.log('   サイト登録: どちらも押されていない状態');
    }

    if (data.cw_request_email_floor_plan === 'TRUE') {
      console.log('   間取り、区画図: 送信1ボタンが押された状態');
    } else if (data.cw_request_email_floor_plan === 'FALSE') {
      console.log('   間取り、区画図: 送信2ボタンが押された状態');
    } else {
      console.log('   間取り、区画図: どちらも押されていない状態');
    }

    if (data.cw_request_email_2f_above === 'TRUE') {
      console.log('   2階以上: 送信1ボタンが押された状態');
    } else if (data.cw_request_email_2f_above === 'FALSE') {
      console.log('   2階以上: 送信2ボタンが押された状態');
    } else {
      console.log('   2階以上: どちらも押されていない状態');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

main();
