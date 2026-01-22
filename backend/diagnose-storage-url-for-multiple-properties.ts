import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnoseMultiplePropertiesStorageUrl() {
  console.log('=== 複数物件の格納先URL取得診断 ===\n');

  try {
    // 1. Google Sheets API認証
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json');
    
    if (!fs.existsSync(keyPath)) {
      console.error(`❌ サービスアカウントキーファイルが見つかりません: ${keyPath}`);
      return;
    }

    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new google.auth.JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });

    const GYOMU_IRAI_SHEET_ID = '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    
    // 2. 業務依頼シートのヘッダー行を取得してCO列の位置を確認
    console.log('📋 ステップ1: 業務依頼シートのヘッダー行を取得\n');
    
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: '業務依頼!1:1',
    });

    const headers = headerResponse.data.values?.[0] || [];
    console.log(`ヘッダー行の列数: ${headers.length}`);
    
    // CO列は93列目（A=1, B=2, ..., CO=93）
    const coColumnIndex = 92; // 0-based index
    if (coColumnIndex < headers.length) {
      console.log(`CO列（93列目）のヘッダー: "${headers[coColumnIndex]}"`);
    } else {
      console.log(`⚠️ CO列（93列目）はヘッダー範囲外です`);
    }

    // 3. 物件番号列（A列）を取得して、どの行にどの物件があるか確認
    console.log('\n📋 ステップ2: 物件番号列（A列）を取得\n');
    
    const propertyNumberResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: '業務依頼!A:A',
    });

    const propertyNumbers = propertyNumberResponse.data.values || [];
    console.log(`物件番号列の行数: ${propertyNumbers.length}`);

    // テスト対象の物件番号
    const testProperties = ['AA13154', 'AA13129', 'AA13149'];
    
    console.log('\n📋 ステップ3: テスト物件の行番号を検索\n');
    
    const propertyRowMap: { [key: string]: number } = {};
    
    for (const testProperty of testProperties) {
      const rowIndex = propertyNumbers.findIndex(row => row[0] === testProperty);
      if (rowIndex !== -1) {
        const rowNumber = rowIndex + 1; // 1-based row number
        propertyRowMap[testProperty] = rowNumber;
        console.log(`✅ ${testProperty}: 行${rowNumber}`);
      } else {
        console.log(`❌ ${testProperty}: 見つかりません`);
      }
    }

    // 4. 各物件のCO列（格納先URL）を取得
    console.log('\n📋 ステップ4: 各物件の格納先URLを取得\n');
    
    for (const testProperty of testProperties) {
      const rowNumber = propertyRowMap[testProperty];
      
      if (!rowNumber) {
        console.log(`\n${testProperty}: スキップ（行番号不明）`);
        continue;
      }

      console.log(`\n🔍 ${testProperty} (行${rowNumber}):`);
      
      // CO列のセルを取得
      const cellRange = `業務依頼!CO${rowNumber}`;
      const cellResponse = await sheets.spreadsheets.values.get({
        spreadsheetId: GYOMU_IRAI_SHEET_ID,
        range: cellRange,
      });

      const storageUrl = cellResponse.data.values?.[0]?.[0];
      console.log(`  スプレッドシートのCO${rowNumber}: ${storageUrl || '(空)'}`);

      // データベースの現在の値を確認
      const { data: dbData, error } = await supabase
        .from('property_listings')
        .select('property_number, storage_location')
        .eq('property_number', testProperty)
        .single();

      if (error) {
        console.log(`  データベース: エラー - ${error.message}`);
      } else if (dbData) {
        console.log(`  データベースのstorage_location: ${dbData.storage_location || '(NULL)'}`);
        
        // 比較
        if (storageUrl && dbData.storage_location === storageUrl) {
          console.log(`  ✅ 一致しています`);
        } else if (storageUrl && !dbData.storage_location) {
          console.log(`  ⚠️ スプレッドシートにはあるが、データベースにはない`);
        } else if (!storageUrl && dbData.storage_location) {
          console.log(`  ⚠️ データベースにはあるが、スプレッドシートにはない`);
        } else if (!storageUrl && !dbData.storage_location) {
          console.log(`  ℹ️ 両方とも空`);
        } else {
          console.log(`  ⚠️ 不一致`);
        }
      } else {
        console.log(`  データベース: データなし`);
      }
    }

    // 5. 結論
    console.log('\n\n📊 診断結果:\n');
    console.log('✅ 業務依頼シートから物件番号で行を検索できます');
    console.log('✅ 各物件のCO列（格納先URL）を取得できます');
    console.log('\n💡 次のステップ:');
    console.log('  1. 汎用的な修正スクリプトを作成（物件番号を引数で受け取る）');
    console.log('  2. 不一致がある物件を一括で修正');
    console.log('  3. 今後の同期処理で自動的に正しい値が設定されるようにする');

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

diagnoseMultiplePropertiesStorageUrl();
