import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.join(__dirname, '.env') });

import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function checkBuyerInSheet() {
  console.log('=== スプレッドシートで買主6940を検索 ===\n');
  
  console.log('GOOGLE_SHEETS_BUYER_SPREADSHEET_ID:', process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID ? '設定済み' : '未設定');
  
  if (!process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID) {
    console.error('❌ GOOGLE_SHEETS_BUYER_SPREADSHEET_IDが設定されていません');
    return;
  }
  
  const sheetsClient = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
    sheetName: 'リスト'
  });
  
  // 認証
  await sheetsClient.authenticate();
  
  // 全データを取得
  const allRows = await sheetsClient.readAll();
  console.log(`📊 スプレッドシート総行数: ${allRows.length}\n`);
  
  // 買主6940を検索
  const buyer6940 = allRows.find(row => row['買主番号'] === '6940');
  
  if (!buyer6940) {
    console.log('❌ スプレッドシートに買主6940が見つかりません\n');
    
    // 類似の買主番号を検索
    const similarBuyers = allRows
      .filter(row => {
        const buyerNumber = row['買主番号'];
        return buyerNumber && buyerNumber.toString().includes('6940');
      })
      .slice(0, 5);
    
    if (similarBuyers.length > 0) {
      console.log('類似の買主番号:');
      similarBuyers.forEach(buyer => {
        console.log(`  - ${buyer['買主番号']} (${buyer['●氏名・会社名']})`);
      });
    }
    
    // 最後の数件を表示
    console.log('\n最後の5件の買主番号:');
    allRows.slice(-5).forEach(row => {
      console.log(`  - ${row['買主番号']} (${row['●氏名・会社名']})`);
    });
    
    return;
  }
  
  console.log('✅ スプレッドシートに買主6940が存在します\n');
  console.log('=== 買主6940のデータ ===');
  console.log('買主番号:', buyer6940['買主番号']);
  console.log('氏名:', buyer6940['●氏名・会社名']);
  console.log('電話番号:', buyer6940['●電話番号\n（ハイフン不要）']);
  console.log('メールアドレス:', buyer6940['●メアド']);
  console.log('受付日:', buyer6940['受付日']);
  console.log('問合せ元:', buyer6940['●問合せ元']);
  
  // 行番号を確認
  const rowIndex = allRows.indexOf(buyer6940);
  console.log('\n行番号（0始まり）:', rowIndex);
  console.log('行番号（1始まり）:', rowIndex + 1);
  console.log('スプレッドシート行番号（ヘッダー含む）:', rowIndex + 2);
}

checkBuyerInSheet().catch(console.error);
