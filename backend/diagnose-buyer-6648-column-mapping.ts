// 買主6648のカラムマッピング問題を診断
import { google } from 'googleapis';
import * as path from 'path';
import { BuyerColumnMapper } from './src/services/BuyerColumnMapper';

const SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const SHEET_NAME = '買主リスト';

async function diagnose() {
  try {
    console.log('=== 買主6648カラムマッピング診断 ===\n');

    const auth = new google.auth.GoogleAuth({
      keyFile: path.join(__dirname, 'google-service-account.json'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // ヘッダー取得
    console.log('1. スプレッドシートのヘッダーを取得中...');
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!1:1`,
    });
    const headers = headerResponse.data.values?.[0] || [];
    console.log(`   ヘッダー数: ${headers.length}\n`);

    // 「氏名」関連のカラムを探す
    console.log('2. 「氏名」関連のカラムを検索:');
    headers.forEach((header, index) => {
      if (header.includes('氏名') || header.includes('会社名')) {
        console.log(`   [${index}] "${header}"`);
      }
    });
    console.log('');

    // カラムマッパーの設定を確認
    const mapper = new BuyerColumnMapper();
    const spreadsheetColumns = mapper.getSpreadsheetColumns();
    
    console.log('3. カラムマッパーに登録されている「氏名」関連:');
    spreadsheetColumns.forEach(col => {
      if (col.includes('氏名') || col.includes('会社名')) {
        console.log(`   "${col}"`);
      }
    });
    console.log('');

    // 買主6648のデータを取得
    console.log('4. 買主6648のデータを検索中...');
    const dataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${SHEET_NAME}'!A2:GZ`,
    });
    const rows = dataResponse.data.values || [];
    
    // 買主番号のカラムインデックスを探す
    const buyerNumberIndex = headers.findIndex(h => h === '買主番号');
    console.log(`   買主番号カラムインデックス: ${buyerNumberIndex}`);
    
    // 買主6648を探す
    let buyer6648Row: any[] | null = null;
    let buyer6648RowNumber = -1;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[buyerNumberIndex] === '6648') {
        buyer6648Row = row;
        buyer6648RowNumber = i + 2; // +2 because row 1 is header and array is 0-indexed
        break;
      }
    }

    if (buyer6648Row) {
      console.log(`   ✓ 買主6648を行 ${buyer6648RowNumber} で発見\n`);
      
      // 「氏名・会社名」カラムの値を確認
      const nameColumnIndex = headers.findIndex(h => h === '●氏名・会社名');
      if (nameColumnIndex >= 0) {
        console.log('5. 買主6648の「●氏名・会社名」カラム:');
        console.log(`   カラムインデックス: ${nameColumnIndex}`);
        console.log(`   値: "${buyer6648Row[nameColumnIndex]}"`);
        console.log('');
      } else {
        console.log('5. ⚠️ 「●氏名・会社名」カラムが見つかりません\n');
      }

      // マッピングを試行
      console.log('6. マッピングを試行:');
      try {
        const mapped = mapper.mapSpreadsheetToDatabase(headers, buyer6648Row);
        console.log(`   ✓ マッピング成功`);
        console.log(`   name: "${mapped.name}"`);
        console.log(`   buyer_number: "${mapped.buyer_number}"`);
        console.log('');
      } catch (error: any) {
        console.log(`   ✗ マッピング失敗: ${error.message}\n`);
      }

      // ヘッダーとマッピング設定の差分を確認
      console.log('7. ヘッダーとマッピング設定の差分:');
      const unmappedHeaders: string[] = [];
      headers.forEach(header => {
        if (!spreadsheetColumns.includes(header)) {
          unmappedHeaders.push(header);
        }
      });
      
      if (unmappedHeaders.length > 0) {
        console.log(`   マッピングされていないヘッダー (${unmappedHeaders.length}個):`);
        unmappedHeaders.slice(0, 10).forEach(h => {
          console.log(`   - "${h}"`);
        });
        if (unmappedHeaders.length > 10) {
          console.log(`   ... 他 ${unmappedHeaders.length - 10}個`);
        }
      } else {
        console.log('   ✓ すべてのヘッダーがマッピングされています');
      }
      console.log('');

      // マッピング設定にあってヘッダーにないものを確認
      const missingInSheet: string[] = [];
      spreadsheetColumns.forEach(col => {
        if (!headers.includes(col)) {
          missingInSheet.push(col);
        }
      });
      
      if (missingInSheet.length > 0) {
        console.log(`8. マッピング設定にあるがスプレッドシートにないカラム (${missingInSheet.length}個):`);
        missingInSheet.slice(0, 10).forEach(col => {
          console.log(`   - "${col}"`);
        });
        if (missingInSheet.length > 10) {
          console.log(`   ... 他 ${missingInSheet.length - 10}個`);
        }
      } else {
        console.log('8. ✓ マッピング設定のすべてのカラムがスプレッドシートに存在します');
      }

    } else {
      console.log('   ✗ 買主6648が見つかりませんでした');
    }

  } catch (error: any) {
    console.error('診断エラー:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
  }
}

diagnose();
