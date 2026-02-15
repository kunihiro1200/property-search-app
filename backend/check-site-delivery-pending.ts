import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

import { WorkTaskService } from './src/services/WorkTaskService';

async function main() {
  console.log('🔍 「サイト依頼済み納品待ち」カテゴリーの全物件を確認します...\n');

  const service = new WorkTaskService();
  const allTasks = await service.list({ limit: 1000, offset: 0 });

  const siteDeliveryPendingTasks = allTasks.filter(task => {
    const category = service.calculateSidebarCategory(task);
    return category.startsWith('サイト依頼済み納品待ち');
  });

  console.log(`📊 「サイト依頼済み納品待ち」カテゴリーの物件数: ${siteDeliveryPendingTasks.length}\n`);

  siteDeliveryPendingTasks.forEach(task => {
    const category = service.calculateSidebarCategory(task);
    console.log(`物件番号: ${task.property_number}`);
    console.log(`  カテゴリー: ${category}`);
    console.log(`  サイト登録締め日: ${task.site_registration_deadline}`);
    console.log(`  サイト登録納期予定日: ${task.site_registration_due_date}`);
    console.log('');
  });
}

main();
