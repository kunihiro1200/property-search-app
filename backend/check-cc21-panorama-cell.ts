import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { GyomuListService } from './src/services/GyomuListService';

dotenv.config();

async function checkCC21PanoramaCell() {
  console.log('🔍 CC21のパノラマURLセルを確認中...\n');

  try {
    // 業務リストからスプシURLを取得
    const gyomuListService = new GyomuListService();
    const gyomuData = await gyomuListService.getByPropertyNumber('CC21');

    if (!gyomuData?.spreadsheetUrl) {
      console.error('❌ CC21のスプシURLが見つかりません');
      return;
    }

    console.log('✅ スプシURL:', gyomuData.spreadsheetUrl);

    // スプレッドシートIDを抽出
    const match = gyomuData.spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      console.error('❌ スプレッドシートIDの抽出に失敗しました');
      return;
    }

    const spreadsheetId = match[1];
    console.log('✅ スプレッドシートID:', spreadsheetId);

    // athomeシートのN1セルとその周辺を確認
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    const sheets = (sheetsClient as any).sheets;

    // N1セルとその周辺（M1:O1）を読み取り
    console.log('\n📋 N1セルとその周辺（M1:O1）を確認:');
    
    const sheetNamePatterns = ['athome ', 'athome'];
    
    for (const sheetName of sheetNamePatterns) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!M1:O1`,
        });

        const values = response.data.values;
        console.log(`\n✅ シート名: "${sheetName}"`);
        console.log('M1:', values?.[0]?.[0] || '(空)');
        console.log('N1:', values?.[0]?.[1] || '(空)');
        console.log('O1:', values?.[0]?.[2] || '(空)');
        
        // 見つかったらループを抜ける
        if (values && values.length > 0) {
          break;
        }
      } catch (error: any) {
        console.log(`⚠️ シート名 "${sheetName}" では見つかりませんでした`);
      }
    }

    // パノラマという文字列を含むセルを検索
    console.log('\n🔍 "パノラマ"または"panorama"を含むセルを検索中...');
    
    for (const sheetName of sheetNamePatterns) {
      try {
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range: `${sheetName}!A1:Z10`,
        });

        const values = response.data.values;
        if (values) {
          for (let rowIndex = 0; rowIndex < values.length; rowIndex++) {
            const row = values[rowIndex];
            for (let colIndex = 0; colIndex < row.length; colIndex++) {
              const cell = row[colIndex];
              if (cell && typeof cell === 'string') {
                const lowerCell = cell.toLowerCase();
                if (lowerCell.includes('パノラマ') || lowerCell.includes('panorama') || lowerCell.includes('https://')) {
                  const colLetter = String.fromCharCode(65 + colIndex);
                  console.log(`  ${colLetter}${rowIndex + 1}: ${cell.substring(0, 100)}${cell.length > 100 ? '...' : ''}`);
                }
              }
            }
          }
        }
        
        // 見つかったらループを抜ける
        if (values && values.length > 0) {
          break;
        }
      } catch (error: any) {
        console.log(`⚠️ シート名 "${sheetName}" では検索できませんでした`);
      }
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkCC21PanoramaCell();
