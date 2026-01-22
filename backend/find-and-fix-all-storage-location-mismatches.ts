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

/**
 * 全物件の格納先URLを業務依頼シートと比較し、不一致を検出・修正する
 */
async function findAndFixAllMismatches() {
  console.log('=== 全物件の格納先URL不一致検出・修正 ===\n');

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
    
    // 2. 業務依頼シートから物件番号とCO列を取得
    console.log('📋 業務依頼シートからデータを取得中...\n');
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GYOMU_IRAI_SHEET_ID,
      range: '業務依頼!A:CO',
    });

    const rows = response.data.values || [];
    console.log(`取得行数: ${rows.length}`);

    // ヘッダー行をスキップ
    const dataRows = rows.slice(1);
    
    // 物件番号（A列=0）と格納先URL（CO列=92）のマップを作成
    const spreadsheetData: { [key: string]: string } = {};
    
    for (const row of dataRows) {
      const propertyNumber = row[0];
      const storageUrl = row[92]; // CO列は93列目（0-based indexで92）
      
      if (propertyNumber && propertyNumber.startsWith('AA')) {
        spreadsheetData[propertyNumber] = storageUrl || '';
      }
    }

    console.log(`物件数: ${Object.keys(spreadsheetData).length}\n`);

    // 3. データベースから全物件を取得
    console.log('📊 データベースから全物件を取得中...\n');
    
    const { data: dbProperties, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .order('property_number');

    if (error) {
      console.error('❌ データベース取得エラー:', error.message);
      return;
    }

    console.log(`データベース物件数: ${dbProperties.length}\n`);

    // 4. 不一致を検出
    console.log('🔍 不一致を検出中...\n');
    
    const mismatches: Array<{
      propertyNumber: string;
      spreadsheetValue: string;
      dbValue: string;
      type: 'missing_in_db' | 'different' | 'empty_in_spreadsheet';
    }> = [];

    for (const dbProperty of dbProperties) {
      const propertyNumber = dbProperty.property_number;
      const dbValue = dbProperty.storage_location || '';
      const spreadsheetValue = spreadsheetData[propertyNumber] || '';

      // スプレッドシートにURLがあるが、DBにない、または異なる
      if (spreadsheetValue && dbValue !== spreadsheetValue) {
        mismatches.push({
          propertyNumber,
          spreadsheetValue,
          dbValue,
          type: dbValue ? 'different' : 'missing_in_db'
        });
      }
    }

    console.log(`不一致件数: ${mismatches.length}\n`);

    if (mismatches.length === 0) {
      console.log('✅ 不一致はありません！');
      return;
    }

    // 5. 不一致の詳細を表示
    console.log('📋 不一致の詳細:\n');
    
    for (const mismatch of mismatches.slice(0, 10)) { // 最初の10件のみ表示
      console.log(`${mismatch.propertyNumber}:`);
      console.log(`  スプレッドシート: ${mismatch.spreadsheetValue.substring(0, 60)}...`);
      console.log(`  データベース: ${mismatch.dbValue || '(NULL)'}`);
      console.log(`  タイプ: ${mismatch.type}\n`);
    }

    if (mismatches.length > 10) {
      console.log(`... 他${mismatches.length - 10}件\n`);
    }

    // 6. 修正するか確認
    console.log('💡 修正オプション:');
    console.log('  1. 自動修正を実行する場合: FIX=true を環境変数に設定');
    console.log('  2. 個別修正する場合: fix-storage-location-for-any-property.ts を使用\n');

    const shouldFix = process.env.FIX === 'true';

    if (!shouldFix) {
      console.log('ℹ️ 診断モードで実行しました（修正は行いません）');
      console.log('修正を実行する場合: FIX=true npx ts-node find-and-fix-all-storage-location-mismatches.ts');
      return;
    }

    // 7. 一括修正
    console.log('🔧 一括修正を開始します...\n');
    
    let successCount = 0;
    let failCount = 0;

    for (const mismatch of mismatches) {
      try {
        const { error: updateError } = await supabase
          .from('property_listings')
          .update({
            storage_location: mismatch.spreadsheetValue,
            updated_at: new Date().toISOString()
          })
          .eq('property_number', mismatch.propertyNumber);

        if (updateError) {
          console.log(`❌ ${mismatch.propertyNumber}: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`✅ ${mismatch.propertyNumber}`);
          successCount++;
        }
      } catch (err) {
        console.log(`❌ ${mismatch.propertyNumber}: ${err}`);
        failCount++;
      }
    }

    // 8. サマリー
    console.log('\n\n=== 修正結果サマリー ===\n');
    console.log(`成功: ${successCount}件`);
    console.log(`失敗: ${failCount}件`);
    console.log(`合計: ${mismatches.length}件`);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

findAndFixAllMismatches();
