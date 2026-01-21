import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

dotenv.config();

async function findCC21FavoriteCells() {
  console.log('🔍 CC21のお気に入り文言とこちらの物件についてのセル位置を探索中...\n');

  try {
    const propertySheetId = '1ydteBGDPxs_20OuL67e6seig9-V43E69djAgm7Vf6sA';
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: propertySheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ CC21の個別スプレッドシートに接続しました\n');

    // 広範囲を読み取って「ラベル」と「こちらの物件について」を探す
    console.log('📋 A130:M170の範囲を読み取り中...');
    const data = await sheetsClient.readRange('A130:M170');

    if (!data) {
      console.log('❌ データが見つかりません');
      return;
    }

    // 「ラベル」を探す
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '');
        if (cell.includes('ラベル')) {
          console.log(`\n✅ 「ラベル」見出し発見: 行${i + 1}, 列${String.fromCharCode(65 + j)}`);
          console.log(`   内容: "${cell}"`);
          // 次の行または同じ行の次のセルを確認
          if (i + 1 < data.length && data[i + 1][j]) {
            console.log(`   値（下のセル）: "${data[i + 1][j]}"`);
          }
          if (row[j + 1]) {
            console.log(`   値（右のセル）: "${row[j + 1]}"`);
          }
        }
        
        if (cell.includes('こちらの物件について') || cell.includes('物件について')) {
          console.log(`\n✅ 「こちらの物件について」見出し発見: 行${i + 1}, 列${String.fromCharCode(65 + j)}`);
          console.log(`   内容: "${cell}"`);
          // 次の行または同じ行の次のセルを確認
          if (i + 1 < data.length && data[i + 1][j]) {
            console.log(`   値（下のセル）: "${data[i + 1][j]}"`);
          }
          if (row[j + 1]) {
            console.log(`   値（右のセル）: "${row[j + 1]}"`);
          }
        }

        // 実際の値を探す（スプレッドシートの画像から）
        if (cell.includes('中古＋新築') || cell.includes('築2LDK')) {
          console.log(`\n✅ お気に入り文言候補発見: 行${i + 1}, 列${String.fromCharCode(65 + j)}`);
          console.log(`   内容: "${cell}"`);
        }

        if (cell.includes('キャンペーン適用中') || cell.includes('収納スペース')) {
          console.log(`\n✅ こちらの物件について候補発見: 行${i + 1}, 列${String.fromCharCode(65 + j)}`);
          console.log(`   内容: "${cell}"`);
        }
      }
    }

    console.log('\n✅ 探索完了');

  } catch (error) {
    console.error('❌ エラー:', error);
    throw error;
  }
}

findCC21FavoriteCells().catch(console.error);
