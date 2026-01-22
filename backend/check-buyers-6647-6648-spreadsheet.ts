/**
 * スプレッドシートで買主6647と6648を確認
 */
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { config } from 'dotenv';

config();

async function checkBuyersInSpreadsheet() {
  console.log('=== スプレッドシートで買主6647と6648を確認 ===\n');

  try {
    const sheetsConfig = {
      spreadsheetId: '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY',
      sheetName: '買主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    const allRows = await sheetsClient.readAll();
    console.log(`総行数: ${allRows.length}\n`);
    
    // 6647と6648を含む行を検索
    const targetRows = allRows.filter((row: any) => {
      const buyerNumber = row['買主番号'];
      const buyerNumberStr = String(buyerNumber || '');
      return buyerNumberStr === '6647' || buyerNumberStr === '6648';
    });
    
    if (targetRows.length === 0) {
      console.log('⚠️ 買主6647と6648が見つかりません');
      
      // 近い番号を探す
      console.log('\n近い番号を探しています...');
      const nearbyRows = allRows.filter((row: any) => {
        const buyerNumber = row['買主番号'];
        const buyerNumberStr = String(buyerNumber || '');
        return buyerNumberStr.includes('664') || buyerNumberStr.includes('665');
      });
      
      if (nearbyRows.length > 0) {
        console.log(`\n近い番号が ${nearbyRows.length} 件見つかりました:`);
        nearbyRows.slice(0, 10).forEach((row: any) => {
          console.log(`  - 買主番号: ${row['買主番号']}, 氏名: ${row['氏名']}`);
        });
      }
    } else {
      console.log(`✓ ${targetRows.length} 件見つかりました\n`);
      
      targetRows.forEach((row: any) => {
        console.log(`--- 買主 ${row['買主番号']} ---`);
        console.log('氏名:', row['氏名']);
        console.log('メールアドレス:', row['メールアドレス']);
        console.log('電話番号:', row['電話番号']);
        console.log('物件番号:', row['物件番号']);
        console.log('問合元:', row['問合元']);
        console.log('配信タイプ:', row['配信タイプ']);
        console.log('配信エリア:', row['配信エリア']);
        console.log('希望物件種別:', row['希望物件種別']);
        console.log('');
      });
      
      // メールアドレスと電話番号が同じか確認
      if (targetRows.length === 2) {
        const row1 = targetRows[0];
        const row2 = targetRows[1];
        
        console.log('=== 重複チェック ===');
        const email1 = row1['メールアドレス'];
        const email2 = row2['メールアドレス'];
        const phone1 = row1['電話番号'];
        const phone2 = row2['電話番号'];
        
        console.log('メールアドレス:');
        console.log(`  6647: ${email1}`);
        console.log(`  6648: ${email2}`);
        console.log(`  同じ: ${email1 === email2 ? 'はい' : 'いいえ'}`);
        
        console.log('\n電話番号:');
        console.log(`  6647: ${phone1}`);
        console.log(`  6648: ${phone2}`);
        console.log(`  同じ: ${phone1 === phone2 ? 'はい' : 'いいえ'}`);
      }
    }
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }

  console.log('\n✅ 確認完了');
  process.exit(0);
}

checkBuyersInSpreadsheet().catch(console.error);
