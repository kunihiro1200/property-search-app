import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

config();

async function searchAA13154() {
  console.log('=== スプレッドシートでAA13154を検索 ===\n');

  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: '売主リスト',
    serviceAccountKeyPath: 'google-service-account.json'
  });

  try {
    await sheetsClient.authenticate();
    console.log('✅ スプレッドシートに接続しました\n');

    const rows = await sheetsClient.readAll();
    console.log(`📊 ${rows.length} 件のデータを取得\n`);

    // 最初の行のカラム名を表示
    if (rows.length > 0) {
      console.log('利用可能なカラム:');
      const columns = Object.keys(rows[0]);
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
      console.log('');
    }

    // AA13154を検索（物件番号カラムで）
    console.log('🔍 物件番号カラムでAA13154を検索...\n');
    const aa13154 = rows.find((row: any) => row['物件番号'] === 'AA13154');

    if (aa13154) {
      console.log('✅ AA13154が見つかりました！\n');
      console.log('📋 物件データ:');
      Object.entries(aa13154).forEach(([key, value]) => {
        if (value !== null && value !== '' && value !== undefined) {
          console.log(`  ${key}: ${value}`);
        }
      });
    } else {
      console.log('❌ 物件番号カラムにAA13154が見つかりません\n');
      
      // 全カラムで検索
      console.log('🔍 全カラムでAA13154を検索...\n');
      const matchingRows = rows.filter((row: any) => {
        return Object.values(row).some(value => 
          String(value).includes('AA13154')
        );
      });

      if (matchingRows.length > 0) {
        console.log(`✅ ${matchingRows.length} 件の一致するデータが見つかりました:\n`);
        matchingRows.forEach((row: any, index: number) => {
          console.log(`--- 一致 ${index + 1} ---`);
          Object.entries(row).forEach(([key, value]) => {
            if (String(value).includes('AA13154')) {
              console.log(`  ${key}: ${value}`);
            }
          });
          console.log('');
        });
      } else {
        console.log('❌ スプレッドシート全体でAA13154が見つかりません');
        console.log('\n💡 確認事項:');
        console.log('  1. 物件番号が正しいか（大文字小文字、スペース、全角半角）');
        console.log('  2. データが削除されていないか');
        console.log('  3. 別のシートに存在しないか');
      }
    }

    // AA13129も確認
    console.log('\n🔍 比較のためAA13129も検索...\n');
    const aa13129 = rows.find((row: any) => row['物件番号'] === 'AA13129');
    
    if (aa13129) {
      console.log('✅ AA13129が見つかりました');
      console.log('  格納先URL:', aa13129['格納先URL'] || '(未設定)');
      console.log('  保管場所:', aa13129['保管場所'] || '(未設定)');
    } else {
      console.log('❌ AA13129も見つかりません');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  }

  console.log('\n=== 検索完了 ===');
}

searchAA13154().catch(console.error);
