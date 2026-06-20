import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function checkCC100AthomeSheet() {
  console.log('=== athomeシートでCC100を確認 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // 業務リストスプレッドシートのathomeシート
    const spreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID || '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g';
    const sheetName = 'athome';
    
    console.log(`スプレッドシートID: ${spreadsheetId}`);
    console.log(`シート名: ${sheetName}\n`);
    
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId,
      sheetName,
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await sheetsClient.authenticate();
    console.log('✅ Google Sheets認証成功\n');

    // 全データを読み取る
    console.log('📊 athomeシートからCC100を検索中...\n');
    const allRows = await sheetsClient.readAll();
    
    console.log(`📊 Total rows: ${allRows.length}\n`);
    
    // CC100を検索（物件番号列を探す）
    let cc100Row = null;
    let rowIndex = -1;
    
    // 物件番号列の可能性がある列名
    const possiblePropertyNumberColumns = ['物件番号', '物件No', 'No', '番号', 'property_number'];
    
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      for (const colName of possiblePropertyNumberColumns) {
        if (row[colName] === 'CC100') {
          cc100Row = row;
          rowIndex = i;
          break;
        }
      }
      if (cc100Row) break;
    }
    
    if (cc100Row) {
      console.log(`✅ CC100が見つかりました（行番号: ${rowIndex + 2}）:\n`);
      
      // 全ての列を表示
      console.log('   全データ:');
      const keys = Object.keys(cc100Row);
      for (const key of keys) {
        const value = cc100Row[key];
        if (value) {
          // 長い値は省略
          const displayValue = String(value).length > 100 
            ? String(value).substring(0, 100) + '...' 
            : value;
          console.log(`   ${key}: ${displayValue}`);
        }
      }
      
      // パノラマURL（N列）を確認
      console.log('\n   パノラマURL関連:');
      const panoramaColumns = Object.keys(cc100Row).filter(key => 
        key.includes('パノラマ') || key.includes('panorama') || key === 'N'
      );
      if (panoramaColumns.length > 0) {
        for (const col of panoramaColumns) {
          console.log(`   ${col}: ${cc100Row[col]}`);
        }
      } else {
        console.log('   ⚠️  パノラマURL列が見つかりません');
      }
      
      // おすすめポイント関連を確認
      console.log('\n   おすすめポイント関連:');
      const recommendColumns = Object.keys(cc100Row).filter(key => 
        key.includes('おすすめ') || key.includes('recommend') || key.includes('ポイント')
      );
      if (recommendColumns.length > 0) {
        for (const col of recommendColumns) {
          console.log(`   ${col}: ${cc100Row[col]}`);
        }
      } else {
        console.log('   ⚠️  おすすめポイント列が見つかりません');
      }
      
      // 物件種別を確認
      console.log('\n   物件種別:');
      const typeColumns = Object.keys(cc100Row).filter(key => 
        key.includes('種別') || key.includes('type') || key.includes('タイプ')
      );
      if (typeColumns.length > 0) {
        for (const col of typeColumns) {
          console.log(`   ${col}: ${cc100Row[col]}`);
        }
      }
      
    } else {
      console.log('❌ CC100が見つかりませんでした');
      console.log('\n   利用可能な列名:');
      if (allRows.length > 0) {
        const keys = Object.keys(allRows[0]);
        console.log(`   ${keys.join(', ')}`);
      }
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.message.includes('Quota exceeded')) {
      console.error('\n⚠️  Google Sheets APIのクォータを超過しました。');
      console.error('   5-10分待ってから再度実行してください。');
    }
  }
}

checkCC100AthomeSheet()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
