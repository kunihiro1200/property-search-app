import { config } from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

// 環境変数を読み込む
config();

async function searchAA13129InSheets() {
  console.log('=== 全シートからAA13129を検索 ===\n');

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID!;
  
  // 検索対象のシート名リスト
  const sheetNames = [
    '売主リスト',
    '添付シート',
    'その他シート',
    '売主追客ログ',
    '訪問査定数',
    '専任件数',
    '専任割合',
    '一般媒介件数',
    '査定書作成',
    '次電日過去',
    'カラム'
  ];
  
  for (const sheetName of sheetNames) {
    console.log(`\n🔍 ${sheetName} を検索中...`);
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: 'google-service-account.json'
    });
    
    try {
      // 認証
      await sheetsClient.authenticate();
      
      // データを取得
      const rows = await sheetsClient.readAll();
      
      if (rows.length === 0) {
        console.log(`  データなし`);
        continue;
      }
      
      // AA13129を含む行を検索
      const matchingRows = rows.filter((row: any) => {
        return Object.values(row).some(value => 
          value && String(value).includes('AA13129')
        );
      });
      
      if (matchingRows.length > 0) {
        console.log(`  ✅ ${matchingRows.length} 件見つかりました！`);
        
        matchingRows.forEach((row: any, index: number) => {
          console.log(`\n  --- 行 ${index + 1} ---`);
          Object.entries(row).forEach(([key, value]) => {
            if (value && String(value).includes('AA13129')) {
              console.log(`    ${key}: ${value}`);
            }
          });
          
          // 格納先URL関連のカラムを表示
          const storageKeys = Object.keys(row).filter(key => 
            key.includes('格納') || 
            key.includes('保管') || 
            key.includes('URL') ||
            key.includes('Drive') ||
            key.includes('ドライブ')
          );
          
          if (storageKeys.length > 0) {
            console.log(`\n    📁 格納先関連のカラム:`);
            storageKeys.forEach(key => {
              console.log(`      ${key}: ${row[key] || '(空)'}`);
            });
          }
        });
      } else {
        console.log(`  見つかりませんでした`);
      }
      
    } catch (error: any) {
      console.log(`  ❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n=== 検索完了 ===');
}

searchAA13129InSheets().catch(console.error);
