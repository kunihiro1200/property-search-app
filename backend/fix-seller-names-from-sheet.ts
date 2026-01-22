import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { encrypt, decrypt } from './src/utils/encryption';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function fixSellerNames() {
  console.log('Starting seller name fix from spreadsheet...\n');

  try {
    // Google Sheetsクライアントを初期化
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH,
      clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
      clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
    };

    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();

    // スプレッドシートからデータを取得
    console.log('Fetching data from spreadsheet...');
    const sheetData = await sheetsClient.readAll();
    console.log(`Found ${sheetData.length} rows in spreadsheet\n`);

    // 最初の行で利用可能な列名を確認
    if (sheetData.length > 0) {
      console.log('Available columns in spreadsheet:');
      const firstRow = sheetData[0];
      Object.keys(firstRow).forEach((key) => {
        if (key.includes('名前') || key.includes('氏名')) {
          console.log(`  - "${key}"`);
        }
      });
      console.log('');
    }

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const row of sheetData) {
      try {
        // 売主番号を取得
        const sellerNumber = row['売主番号'];
        if (!sellerNumber) {
          skippedCount++;
          continue;
        }

        // 名前を取得 - 複数の可能性のある列名を試す
        let name = row['名前(漢字のみ)'] || row['名前(漢字のみ）'] || row['名前'] || row['氏名'];
        
        // デバッグ: 最初の5件で実際の値を確認
        if (updatedCount + skippedCount < 5) {
          console.log(`${sellerNumber}: 名前の値 = "${name}"`);
          console.log(`  利用可能な名前関連の列:`);
          Object.keys(row).forEach((key) => {
            if (key.includes('名前') || key.includes('氏名')) {
              console.log(`    "${key}": "${row[key]}"`);
            }
          });
        }
        
        if (!name || typeof name !== 'string' || name.trim() === '') {
          if (updatedCount + skippedCount < 5) {
            console.log(`${sellerNumber}: 名前が空です - スキップ`);
          }
          skippedCount++;
          continue;
        }

        // データベースで売主を検索
        const { data: sellers, error: fetchError } = await supabase
          .from('sellers')
          .select('id, name, seller_number')
          .eq('seller_number', sellerNumber);

        if (fetchError) {
          console.error(`${sellerNumber}: データベースエラー -`, fetchError.message);
          errorCount++;
          continue;
        }

        if (!sellers || sellers.length === 0) {
          console.log(`${sellerNumber}: データベースに見つかりません - スキップ`);
          skippedCount++;
          continue;
        }

        const seller = sellers[0];

        // 現在の名前を復号化
        let currentName = '';
        try {
          currentName = decrypt(seller.name);
        } catch (e) {
          console.log(`${sellerNumber}: 復号化エラー - 更新します`);
        }

        // 名前が「不明」または空の場合のみ更新
        if (currentName !== '不明' && currentName.trim() !== '') {
          console.log(`${sellerNumber}: 既に有効な名前があります ("${currentName}") - スキップ`);
          skippedCount++;
          continue;
        }

        // 名前を暗号化
        const encryptedName = encrypt(name.trim());

        // データベースを更新
        const { error: updateError } = await supabase
          .from('sellers')
          .update({ name: encryptedName })
          .eq('id', seller.id);

        if (updateError) {
          console.error(`${sellerNumber}: 更新エラー -`, updateError.message);
          errorCount++;
          continue;
        }

        console.log(`${sellerNumber}: 更新しました - "${name}"`);
        updatedCount++;

      } catch (error: any) {
        console.error(`行の処理エラー:`, error.message);
        errorCount++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('完了');
    console.log('='.repeat(60));
    console.log(`更新: ${updatedCount}件`);
    console.log(`スキップ: ${skippedCount}件`);
    console.log(`エラー: ${errorCount}件`);

  } catch (error: any) {
    console.error('\n致命的なエラー:', error.message);
    process.exit(1);
  }
}

fixSellerNames()
  .then(() => {
    console.log('\n処理完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
