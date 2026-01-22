// 業務リスト（業務依頼）にCC5が存在するか確認
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function checkCC5InGyomuList() {
  console.log('=== 業務リスト（業務依頼）でCC5を確認 ===\n');

  try {
    // 業務リスト（業務依頼）に接続
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    console.log('✅ 業務リストに接続しました\n');

    const rows = await gyomuListClient.readAll();
    console.log(`全行数: ${rows.length}件\n`);

    // CC5を検索
    const cc5Row = rows.find(row => row['物件番号'] === 'CC5');

    if (!cc5Row) {
      console.log('❌ 業務リストにCC5が見つかりませんでした');
      console.log('');
      console.log('最初の5件の物件番号を表示:');
      rows.slice(0, 5).forEach((row, index) => {
        console.log(`  ${index + 1}. ${row['物件番号']}`);
      });
      return;
    }

    console.log('✅ CC5が見つかりました！\n');
    console.log('物件番号:', cc5Row['物件番号']);
    console.log('格納先URL:', cc5Row['格納先URL'] || '(空)');
    console.log('スプシURL:', cc5Row['スプシURL'] || '(空)');
    console.log('');

    if (cc5Row['格納先URL']) {
      console.log('✅ 格納先URLが設定されています');
      console.log('   このURLをstorage_locationに同期する必要があります');
    } else {
      console.log('❌ 格納先URLが設定されていません');
    }

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    throw error;
  }
}

checkCC5InGyomuList()
  .then(() => {
    console.log('\n処理が完了しました');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n処理中にエラーが発生しました:', error);
    process.exit(1);
  });
