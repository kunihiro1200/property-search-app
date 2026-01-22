// スプレッドシートでAA4885を検索
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

const PROPERTY_LIST_SPREADSHEET_ID = '1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY';
const PROPERTY_LIST_SHEET_NAME = '物件';

async function checkAA4885InSpreadsheet() {
  console.log('🔍 スプレッドシートでAA4885を検索中...\n');
  console.log('='.repeat(80));
  
  try {
    // Google Sheetsクライアントを初期化
    const sheetsConfig = {
      spreadsheetId: PROPERTY_LIST_SPREADSHEET_ID,
      sheetName: PROPERTY_LIST_SHEET_NAME,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    // すべてのデータを読み込み
    console.log('📥 スプレッドシートからデータを読み込み中...');
    const allData = await sheetsClient.readAll();
    console.log(`📊 総行数: ${allData.length}\n`);
    
    // デバッグ: 最初の5行を表示
    console.log('🔍 デバッグ: 最初の5行のデータ');
    console.log('-'.repeat(80));
    for (let i = 0; i < Math.min(5, allData.length); i++) {
      const row = allData[i];
      console.log(`\n行 ${i + 1}:`);
      console.log(`  利用可能なキー: ${Object.keys(row).slice(0, 10).join(', ')}...`);
      console.log(`  物件番号: ${row['物件番号']}`);
    }
    console.log('\n' + '='.repeat(80) + '\n');
    
    // AA4885を検索
    console.log('🔍 AA4885を検索中...');
    const aa4885Row = allData.find(row => {
      const propertyNumber = String(row['物件番号'] || '').trim();
      if (propertyNumber.includes('4885')) {
        console.log(`  見つかった候補: ${propertyNumber}`);
      }
      return propertyNumber === 'AA4885';
    });
    
    if (aa4885Row) {
      console.log('✅ AA4885が見つかりました！\n');
      console.log('📋 スプレッドシートのデータ:');
      console.log('-'.repeat(80));
      
      // 重要なフィールドを表示
      const importantFields = [
        '物件番号',
        'ATBB状況',
        'ATBB公開フォルダ',
        'athome状況',
        'athome公開フォルダ',
        '物件種別',
        '住所',
        '価格'
      ];
      
      for (const field of importantFields) {
        const value = aa4885Row[field];
        console.log(`  ${field}: ${value || '(空)'}`);
      }
      
      console.log('\n📊 すべてのフィールド:');
      console.log('-'.repeat(80));
      for (const [key, value] of Object.entries(aa4885Row)) {
        if (value) {
          console.log(`  ${key}: ${value}`);
        }
      }
      
    } else {
      console.log('❌ AA4885がスプレッドシートに見つかりません\n');
      
      // AA48で始まる物件を検索
      console.log('🔍 AA48で始まる物件を検索中...');
      const aa48Properties = allData
        .filter(row => {
          const propertyNumber = String(row['物件番号'] || '').trim();
          return propertyNumber.startsWith('AA48');
        })
        .map(row => String(row['物件番号'] || '').trim())
        .sort();
      
      if (aa48Properties.length > 0) {
        console.log(`\n📋 AA48で始まる物件 (${aa48Properties.length}件):`);
        aa48Properties.forEach(pn => console.log(`  - ${pn}`));
      } else {
        console.log('\n❌ AA48で始まる物件が見つかりません');
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

// 実行
checkAA4885InSpreadsheet()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトエラー:', error);
    process.exit(1);
  });
