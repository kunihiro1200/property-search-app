import { StaffManagementService } from './src/services/StaffManagementService';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * スタッフ一覧を表示
 */
async function listStaffMembers() {
  console.log('🔍 Listing all staff members from spreadsheet\n');

  const staffService = new StaffManagementService();

  try {
    // fetchStaffDataメソッドを直接呼び出すためにprivateメソッドにアクセス
    // 代わりに、存在しない担当者名で検索してキャッシュを構築
    await staffService.getWebhookUrl('_dummy_name_to_fetch_all_staff_');

    // キャッシュからスタッフ情報を取得
    // 注意: これはハック的な方法なので、本来はfetchStaffDataをpublicにするか、
    // 別のメソッドを追加すべきです
    
    console.log('スタッフ管理スプレッドシートからデータを取得しました。');
    console.log('以下のスタッフが登録されています:\n');

    // 代わりに、複数の一般的な名前で検索してみる
    const commonNames = ['Y', 'U', 'I', 'K', 'M', 'W', 'T', 'S', 'N', 'H', 'A', 'O'];
    const foundStaff: Array<{ initials: string; name: string; hasWebhook: boolean }> = [];

    for (const initial of commonNames) {
      const result = await staffService.getWebhookUrl(initial);
      if (result.success) {
        foundStaff.push({
          initials: initial,
          name: '(名前不明)',
          hasWebhook: true
        });
        console.log(`✅ イニシャル: ${initial} - Webhook URL: 設定済み`);
      }
    }

    if (foundStaff.length === 0) {
      console.log('❌ スタッフが見つかりませんでした');
      console.log('💡 スプレッドシートの構造を確認してください');
    } else {
      console.log(`\n✅ ${foundStaff.length}名のスタッフが見つかりました`);
    }

    // 「角井」で検索
    console.log('\n🔍 「角井」で検索...');
    const kadoiResult = await staffService.getWebhookUrl('角井');
    if (kadoiResult.success) {
      console.log('✅ 「角井」が見つかりました');
      console.log(`   Webhook URL: ${kadoiResult.webhookUrl}`);
    } else {
      console.log('❌ 「角井」が見つかりませんでした');
      console.log(`   エラー: ${kadoiResult.error}`);
      
      // 部分一致で検索してみる
      console.log('\n💡 スプレッドシートに登録されている名前を確認してください');
      console.log('   - A列: イニシャル');
      console.log('   - C列: 名前');
      console.log('   - F列: Chat webhook');
    }

  } catch (err: any) {
    console.error('❌ List failed:', err.message);
  }
}

listStaffMembers()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
