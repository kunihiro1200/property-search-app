import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

async function checkSheetBuyers() {
  console.log('=== スプレッドシートから買主6647と6648を確認 ===\n');

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: './google-service-account.json',
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.BUYER_SPREADSHEET_ID;

    if (!spreadsheetId) {
      throw new Error('BUYER_SPREADSHEET_ID が設定されていません');
    }

    // シート全体を取得
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: '買主!A:Z', // 適切な範囲に調整
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('データが見つかりません');
      return;
    }

    const headers = rows[0];
    console.log('ヘッダー:', headers.join(', '), '\n');

    // 買主番号のカラムインデックスを見つける
    const buyerNumberIndex = headers.findIndex(h => 
      h.includes('買主番号') || h.includes('番号')
    );
    const nameIndex = headers.findIndex(h => 
      h.includes('氏名') || h.includes('名前')
    );
    const phoneIndex = headers.findIndex(h => 
      h.includes('電話') || h.includes('TEL')
    );
    const emailIndex = headers.findIndex(h => 
      h.includes('メール') || h.includes('mail')
    );

    console.log(`買主番号カラム: ${buyerNumberIndex}`);
    console.log(`氏名カラム: ${nameIndex}`);
    console.log(`電話番号カラム: ${phoneIndex}`);
    console.log(`メールカラム: ${emailIndex}\n`);

    // 買主6647と6648を検索
    const targetBuyers = [6647, 6648];
    const foundBuyers: any[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const buyerNumber = parseInt(row[buyerNumberIndex]);

      if (targetBuyers.includes(buyerNumber)) {
        foundBuyers.push({
          rowNumber: i + 1,
          buyerNumber,
          name: row[nameIndex] || '',
          phone: row[phoneIndex] || '',
          email: row[emailIndex] || '',
          rawRow: row
        });
      }
    }

    console.log(`=== 検索結果: ${foundBuyers.length}件 ===\n`);

    foundBuyers.forEach(buyer => {
      console.log(`行番号: ${buyer.rowNumber}`);
      console.log(`買主番号: ${buyer.buyerNumber}`);
      console.log(`氏名: ${buyer.name}`);
      console.log(`電話番号: ${buyer.phone}`);
      console.log(`メール: ${buyer.email}`);
      console.log('---');
    });

    // 重複チェック
    if (foundBuyers.length === 2) {
      const [buyer1, buyer2] = foundBuyers;
      console.log('\n=== 重複チェック ===');
      console.log(`氏名が同じ: ${buyer1.name === buyer2.name ? '✅ はい' : '❌ いいえ'}`);
      console.log(`  買主6647: "${buyer1.name}"`);
      console.log(`  買主6648: "${buyer2.name}"`);
      console.log(`電話番号が同じ: ${buyer1.phone === buyer2.phone ? '✅ はい' : '❌ いいえ'}`);
      console.log(`  買主6647: "${buyer1.phone}"`);
      console.log(`  買主6648: "${buyer2.phone}"`);
      console.log(`メールが同じ: ${buyer1.email === buyer2.email ? '✅ はい' : '❌ いいえ'}`);
      console.log(`  買主6647: "${buyer1.email}"`);
      console.log(`  買主6648: "${buyer2.email}"`);

      if (buyer1.name === buyer2.name && buyer1.phone === buyer2.phone) {
        console.log('\n⚠️  警告: 氏名と電話番号が完全に同じです！');
        console.log('これが同期失敗の原因である可能性が高いです。');
        console.log('\n推奨対処法:');
        console.log('1. データベースにUNIQUE制約がある場合: スプレッドシートのデータを修正');
        console.log('2. 制約がない場合: 同期ロジックで重複を許可するか判断');
        console.log('3. 実際には別人の場合: 電話番号または氏名を区別できるように修正');
      }
    }

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

checkSheetBuyers();
