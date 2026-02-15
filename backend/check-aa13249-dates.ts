import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';

const PROPERTY_NUMBER = 'AA13249';

async function main() {
  console.log(`🔍 ${PROPERTY_NUMBER}の日付情報を確認します...\n`);

  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    // データベースからデータを取得
    const { data, error } = await supabase
      .from('work_tasks')
      .select('*')
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
    console.log(`   物件番号: "${data.property_number}"`);
    console.log(`   サイト登録締め日: "${data.site_registration_deadline}"`);
    console.log(`   サイト登録納期予定日: "${data.site_registration_due_date}"`);
    console.log(`   サイト登録確認依頼日: "${data.site_registration_confirmation_request_date}"`);
    console.log(`   サイト登録確認: "${data.site_registration_confirmed}"`);
    console.log(`   売買契約締め日: "${data.sales_contract_deadline}"`);
    console.log(`   最終同期日時: "${data.synced_at}"`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

main();
