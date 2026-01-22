import { google } from 'googleapis';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

async function checkBuyer2064FromSheet() {
  try {
    // サービスアカウントキーを読み込む
    const keyPath = path.join(__dirname, 'google-service-account.json');
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials: keyFile,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    console.log('スプレッドシートから買主データを取得中...\n');

    // 買主シートのデータを取得
    const buyerSpreadsheetId = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: buyerSpreadsheetId,
      range: "'買主リスト'!A1:GZ1000", // 十分な範囲を取得
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    const headers = rows[0];
    console.log('ヘッダー行:', headers.slice(0, 10).join(', '), '...\n');

    // 買主番号の列を探す
    const buyerNumberIndex = headers.findIndex(h => 
      h && (h.includes('買主番号') || h.includes('買い主番号') || h === '番号')
    );
    const emailIndex = headers.findIndex(h => 
      h && h.includes('●メアド')
    );

    console.log(`買主番号列: ${buyerNumberIndex} (${headers[buyerNumberIndex]})`);
    console.log(`メール列: ${emailIndex} (${headers[emailIndex]})`);
    
    // すべてのメール関連列を表示
    console.log('\nメール関連の列:');
    headers.forEach((h, i) => {
      if (h && (h.includes('メアド') || h.toLowerCase().includes('email') || h.toLowerCase().includes('mail'))) {
        console.log(`  列${i}: ${h}`);
      }
    });
    console.log();

    if (buyerNumberIndex === -1) {
      console.log('買主番号列が見つかりません');
      return;
    }

    // 2行目のデータを確認（ヘッダーの次の行）
    console.log('=== 2行目のデータ ===');
    if (rows.length > 1) {
      const row2 = rows[1];
      console.log(`買主番号: ${row2[buyerNumberIndex]}`);
      if (emailIndex !== -1) {
        console.log(`メールアドレス: ${row2[emailIndex]}`);
      }
      console.log(`全データ (最初の10列):`, row2.slice(0, 10));
    }

    console.log('\n=== 買主番号2064を検索 ===');
    let found2064 = false;
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const buyerNumber = row[buyerNumberIndex];
      
      if (buyerNumber === '2064' || buyerNumber === 2064) {
        found2064 = true;
        console.log(`\n行 ${i + 1} に買主番号2064が見つかりました:`);
        console.log(`買主番号: ${buyerNumber}`);
        if (emailIndex !== -1) {
          console.log(`メールアドレス: ${row[emailIndex]}`);
        }
        console.log(`全データ (最初の15列):`, row.slice(0, 15));
      }
    }

    if (!found2064) {
      console.log('買主番号2064は見つかりませんでした');
    }

    // kouten0909@icloud.comを検索
    console.log('\n=== メールアドレス kouten0909@icloud.com を検索 ===');
    if (emailIndex !== -1) {
      let foundEmail = false;
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const email = row[emailIndex];
        
        if (email && email.toLowerCase().includes('kouten0909@icloud.com')) {
          foundEmail = true;
          console.log(`\n行 ${i + 1} にメールアドレスが見つかりました:`);
          console.log(`買主番号: ${row[buyerNumberIndex]}`);
          console.log(`メールアドレス: ${email}`);
          console.log(`全データ (最初の15列):`, row.slice(0, 15));
        }
      }
      
      if (!foundEmail) {
        console.log('メールアドレス kouten0909@icloud.com は見つかりませんでした');
      }
    }

    // 統計情報
    console.log('\n=== 統計情報 ===');
    const buyerNumbers = rows.slice(1)
      .map(row => row[buyerNumberIndex])
      .filter(num => num && num !== '');
    
    console.log(`総買主数: ${buyerNumbers.length}`);
    console.log(`最小買主番号: ${Math.min(...buyerNumbers.map(n => parseInt(n) || 0))}`);
    console.log(`最大買主番号: ${Math.max(...buyerNumbers.map(n => parseInt(n) || 0))}`);

  } catch (error) {
    console.error('エラー:', error);
    if (error instanceof Error) {
      console.error('エラーメッセージ:', error.message);
      console.error('スタックトレース:', error.stack);
    }
  }
}

checkBuyer2064FromSheet();
