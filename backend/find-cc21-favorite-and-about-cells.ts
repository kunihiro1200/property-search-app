import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function findCC21FavoriteAndAboutCells() {
  console.log('🔍 CC21のお気に入り文言と「こちらの物件について」を検索中...\n');

  try {
    const propertySheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: propertySheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ CC21の個別スプレッドシートに接続しました\n');

    // 1行目（ヘッダー行）を読み取り
    console.log('📋 1行目（ヘッダー行）を読み取り中...');
    const headerData = await sheetsClient.readRange('A1:Z1');
    console.log('ヘッダー行:', headerData);

    // 140-150行目の全データを読み取り
    console.log('\n📋 140-150行目の全データを読み取り中...');
    const rangeData = await sheetsClient.readRange('A140:Z150');
    
    console.log('rangeDataの型:', typeof rangeData);
    console.log('rangeDataの内容:', JSON.stringify(rangeData, null, 2));
    
    if (rangeData && Array.isArray(rangeData)) {
      console.log('\n各行のデータ:');
      rangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        console.log(`\n行${rowNum}:`);
        console.log('  rowの型:', typeof row);
        console.log('  rowの内容:', JSON.stringify(row, null, 2));
        
        // rowがオブジェクトの場合
        if (row && typeof row === 'object' && !Array.isArray(row)) {
          Object.entries(row).forEach(([key, value]) => {
            if (value && value !== null && value !== '') {
              console.log(`  ${key}: ${value}`);
            }
          });
        }
      });
    }

    // 特定のキーワードを検索
    console.log('\n\n🔍 キーワード検索:');
    console.log('「オススメコメント」を含む行:');
    if (rangeData) {
      rangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        row.forEach((cell: any, j: number) => {
          if (cell && typeof cell === 'string' && cell.includes('オススメコメント')) {
            const colLetter = String.fromCharCode(65 + j);
            console.log(`  ${colLetter}${rowNum}: ${cell}`);
          }
        });
      });
    }

    console.log('\n「こちらの物件について」を含む行:');
    if (rangeData) {
      rangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        row.forEach((cell: any, j: number) => {
          if (cell && typeof cell === 'string' && cell.includes('こちらの物件について')) {
            const colLetter = String.fromCharCode(65 + j);
            console.log(`  ${colLetter}${rowNum}: ${cell}`);
          }
        });
      });
    }

    // 実際のデータ（文字数が多いセル）を検索
    console.log('\n「仲介手数料」を含む行（お気に入り文言の可能性）:');
    if (rangeData) {
      rangeData.forEach((row, i) => {
        const rowNum = 140 + i;
        row.forEach((cell: any, j: number) => {
          if (cell && typeof cell === 'string' && cell.includes('仲介手数料')) {
            const colLetter = String.fromCharCode(65 + j);
            console.log(`  ${colLetter}${rowNum}: ${cell}`);
          }
        });
      });
    }

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

findCC21FavoriteAndAboutCells().catch(console.error);
