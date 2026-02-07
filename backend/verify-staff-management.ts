/**
 * StaffManagementServiceの動作確認スクリプト
 * 
 * 使用方法:
 * npx ts-node backend/verify-staff-management.ts <担当者名>
 * 
 * 例:
 * npx ts-node backend/verify-staff-management.ts Y
 * npx ts-node backend/verify-staff-management.ts 山田太郎
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { StaffManagementService } from './src/services/StaffManagementService';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

async function main() {
  const assigneeName = process.argv[2];

  if (!assigneeName) {
    console.error('使用方法: npx ts-node backend/verify-staff-management.ts <担当者名>');
    console.error('例: npx ts-node backend/verify-staff-management.ts Y');
    process.exit(1);
  }

  console.log('=== StaffManagementService 動作確認 ===\n');
  console.log(`担当者名: ${assigneeName}\n`);

  const service = new StaffManagementService();

  try {
    // Webhook URLを取得
    console.log('Webhook URLを取得中...\n');
    const result = await service.getWebhookUrl(assigneeName);

    if (result.success) {
      console.log('✅ 成功');
      console.log(`Webhook URL: ${result.webhookUrl}\n`);
    } else {
      console.log('❌ エラー');
      console.log(`エラーメッセージ: ${result.error}\n`);
    }

    // キャッシュのテスト
    console.log('--- キャッシュのテスト ---\n');
    console.log('2回目の取得（キャッシュから）...\n');
    const result2 = await service.getWebhookUrl(assigneeName);

    if (result2.success) {
      console.log('✅ キャッシュから取得成功');
      console.log(`Webhook URL: ${result2.webhookUrl}\n`);
    } else {
      console.log('❌ エラー');
      console.log(`エラーメッセージ: ${result2.error}\n`);
    }

    // キャッシュクリアのテスト
    console.log('--- キャッシュクリアのテスト ---\n');
    service.clearCache();
    console.log('キャッシュをクリアしました\n');

    console.log('3回目の取得（スプレッドシートから）...\n');
    const result3 = await service.getWebhookUrl(assigneeName);

    if (result3.success) {
      console.log('✅ スプレッドシートから取得成功');
      console.log(`Webhook URL: ${result3.webhookUrl}\n`);
    } else {
      console.log('❌ エラー');
      console.log(`エラーメッセージ: ${result3.error}\n`);
    }

  } catch (error: any) {
    console.error('❌ 予期しないエラー:', error.message);
    console.error(error.stack);
    process.exit(1);
  }

  console.log('=== 動作確認完了 ===');
}

main();
