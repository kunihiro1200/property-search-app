import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { WorkTaskService } from './src/services/WorkTaskService';

async function main() {
  console.log('🔍 AA12495のサイドバーカテゴリーを確認します...\n');

  const service = new WorkTaskService();
  const task = await service.getByPropertyNumber('AA12495');

  if (!task) {
    console.log('❌ AA12495が見つかりません');
    return;
  }

  console.log('📊 AA12495のデータ:');
  console.log('  物件番号:', task.property_number);
  console.log('  サイト登録締め日:', task.site_registration_deadline);
  console.log('  サイト登録納期予定日:', task.site_registration_due_date);
  console.log('  サイト登録確認依頼日:', task.site_registration_confirmation_request_date);
  console.log('  サイト登録確認:', task.site_registration_confirmed);
  console.log('  売買契約締め日:', task.sales_contract_deadline);
  console.log('  配信日:', task.distribution_date);
  console.log('  公開予定日:', task.publish_scheduled_date);
  console.log('  サイト登録依頼者:', task.site_registration_requestor);
  console.log('  保留:', task.on_hold);
  console.log('');

  const category = service.calculateSidebarCategory(task);
  console.log('📋 計算されたサイドバーカテゴリー:', category);
}

main();
