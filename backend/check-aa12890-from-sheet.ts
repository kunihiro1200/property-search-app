import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import * as dotenv from 'dotenv';

dotenv.config();

async function checkFromSheet() {
  console.log('=== スプレッドシートからAA12890を確認 ===\n');

  const sheetsClient = new GoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID!;

  try {
    // シート全体を取得
    const rows = await sheetsClient.getSheetData(spreadsheetId, 'シート1!A:BZ');

    if (!rows || rows.length === 0) {
      console.log('❌ データが取得できません');
      return;
    }

    // ヘッダー行を取得
    const headers = rows[0];
    console.log('📋 列ヘッダー確認:');
    
    // 重要な列のインデックスを探す
    const sellerNumberIndex = headers.findIndex((h: string) => h === '売主番号');
    const sellerNameIndex = headers.findIndex((h: string) => h === '売主氏名');
    const sellerAddressIndex = headers.findIndex((h: string) => h === '売主住所');
    const propertyAddressIndex = headers.findIndex((h: string) => h === '物件住所');
    const landAreaIndex = headers.findIndex((h: string) => h === '土地面積');
    const buildingAreaIndex = headers.findIndex((h: string) => h === '建物面積');

    console.log(`  売主番号: 列${sellerNumberIndex} (${headers[sellerNumberIndex]})`);
    console.log(`  売主氏名: 列${sellerNameIndex} (${headers[sellerNameIndex]})`);
    console.log(`  売主住所: 列${sellerAddressIndex} (${headers[sellerAddressIndex]})`);
    console.log(`  物件住所: 列${propertyAddressIndex} (${headers[propertyAddressIndex]})`);
    console.log(`  土地面積: 列${landAreaIndex} (${headers[landAreaIndex]})`);
    console.log(`  建物面積: 列${buildingAreaIndex} (${headers[buildingAreaIndex]})`);
    console.log();

    // AA12890の行を探す
    const aa12890Rows = rows.filter((row: any[], index: number) => {
      if (index === 0) return false; // ヘッダー行をスキップ
      return row[sellerNumberIndex] === 'AA12890';
    });

    if (aa12890Rows.length === 0) {
      console.log('❌ AA12890が見つかりません');
      return;
    }

    console.log(`✅ AA12890を${aa12890Rows.length}行発見\n`);

    aa12890Rows.forEach((row: any[], index: number) => {
      console.log(`--- 行 ${index + 1} ---`);
      console.log(`売主番号: ${row[sellerNumberIndex] || '(空)'}`);
      console.log(`売主氏名: ${row[sellerNameIndex] || '(空)'}`);
      console.log(`売主住所: ${row[sellerAddressIndex] || '(空)'}`);
      console.log(`物件住所: ${row[propertyAddressIndex] || '(空)'}`);
      console.log(`土地面積: ${row[landAreaIndex] || '(空)'}`);
      console.log(`建物面積: ${row[buildingAreaIndex] || '(空)'}`);
      
      // 問題をチェック
      if (row[propertyAddressIndex] === row[sellerAddressIndex]) {
        console.log('⚠️  物件住所と売主住所が同じです！');
      }
      if (!row[propertyAddressIndex]) {
        console.log('⚠️  物件住所が空です！');
      }
      if (!row[landAreaIndex] && !row[buildingAreaIndex]) {
        console.log('⚠️  土地面積・建物面積の両方が空です！');
      }
      console.log();
    });

    console.log('\n=== 分析 ===');
    console.log('スプレッドシートに複数行ある場合、同期処理で重複が発生している可能性があります。');
    console.log('物件住所が空の場合、PropertySyncHandlerが売主住所をフォールバックしている可能性があります。');

  } catch (error) {
    console.error('エラー:', error);
  }
}

checkFromSheet()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
