import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '.env') });

import { createClient } from '@supabase/supabase-js';
import { WorkTaskService } from './src/services/WorkTaskService';

const PROPERTY_NUMBER = 'AA1821';

async function main() {
  console.log('🔍 AA1821のサイドバー表示情報を確認します...\n');

  // Supabaseクライアント
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  // WorkTaskServiceを使用
  const workTaskService = new WorkTaskService();

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
    console.log(`   製本予定日: "${data.binding_scheduled_date}"`);
    console.log(`   製本完了: "${data.binding_completed}"`);
    console.log(`   売買契約締め日: "${data.sales_contract_deadline}"`);
    console.log(`   売買契約確認: "${data.sales_contract_confirmed}"`);
    console.log(`   売買契約担当: "${data.sales_contract_assignee}"`);
    console.log(`   保留: "${data.on_hold}"`);
    console.log(`   サイト登録締め日: "${data.site_registration_deadline}"`);
    console.log(`   サイト登録納期予定日: "${data.site_registration_due_date}"`);
    console.log(`   サイト登録確認: "${data.site_registration_confirmed}"`);

    // サイドバーカテゴリーを計算
    const sidebarCategory = workTaskService.calculateSidebarCategory(data);

    console.log(`\n✅ 計算されたサイドバーカテゴリー: "${sidebarCategory}"`);
    console.log(`\n期待される表示: "売買契約 製本待ち"`);

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

main();
