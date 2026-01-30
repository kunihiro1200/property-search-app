import * as dotenv from 'dotenv';
dotenv.config({ path: './backend/.env.local' });

async function checkAA13501SpreadsheetPropertyAddress() {
  try {
    console.log('=== AA13501 Spreadsheet Property Address Check ===');
    
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    const sheetsConfig = {
      spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    };
    
    const sheetsClient = new GoogleSheetsClient(sheetsConfig);
    await sheetsClient.authenticate();
    
    // 全データを取得
    const rows = await sheetsClient.readAll();
    
    // AA13501を探す
    const aa13501Row = rows.find((row: any) => row['売主番号'] === 'AA13501');
    
    if (!aa13501Row) {
      console.error('❌ AA13501 not found in spreadsheet');
      return;
    }
    
    console.log('\n=== AA13501 Row Data ===');
    console.log('売主番号:', aa13501Row['売主番号']);
    console.log('名前:', aa13501Row['名前(漢字のみ）']);
    console.log('不通:', aa13501Row['不通']);
    console.log('コメント:', aa13501Row['コメント']);
    
    // R列「物件所在地」を確認
    console.log('\n=== R列「物件所在地」 ===');
    console.log('物件所在地:', aa13501Row['物件所在地']);
    console.log('物件所在地 (type):', typeof aa13501Row['物件所在地']);
    console.log('物件所在地 (length):', aa13501Row['物件所在地']?.length);
    console.log('物件所在地 (empty):', aa13501Row['物件所在地'] === '');
    console.log('物件所在地 (undefined):', aa13501Row['物件所在地'] === undefined);
    console.log('物件所在地 (null):', aa13501Row['物件所在地'] === null);
    
    // 全てのキーを表示
    console.log('\n=== All Keys ===');
    console.log(Object.keys(aa13501Row));
    
    // R列に関連するキーを探す
    console.log('\n=== Keys containing "物件" or "所在" ===');
    const relatedKeys = Object.keys(aa13501Row).filter(key => 
      key.includes('物件') || key.includes('所在')
    );
    console.log(relatedKeys);
    relatedKeys.forEach(key => {
      console.log(`  ${key}: ${aa13501Row[key]}`);
    });
    
  } catch (error) {
    console.error('❌ Check failed:', error);
  }
}

checkAA13501SpreadsheetPropertyAddress();
