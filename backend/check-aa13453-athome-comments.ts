// AA13453のathomeシートからコメントデータを取得
import { google } from 'googleapis';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

async function checkAA13453AthomeComments() {
  console.log('🔍 Checking AA13453 athome sheet comments...\n');
  
  // Google Sheets APIクライアントを初期化
  const serviceAccountKeyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  
  const fs = await import('fs');
  const credentials = JSON.parse(fs.readFileSync(serviceAccountKeyPath, 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  
  const sheets = google.sheets({ version: 'v4', auth });
  
  // AA13453の個別スプレッドシートID
  const spreadsheetId = '1pS8MTQSceRZGlaWtup8aYBL2xfFpqJjkbFYnolFXShc';
  const sheetName = 'athome';
  
  console.log('📊 Spreadsheet ID:', spreadsheetId);
  console.log('📋 Sheet name:', sheetName);
  
  try {
    // 物件種別を確認（D8セル）
    const typeResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!D8`,
    });
    
    const propertyType = typeResponse.data.values?.[0]?.[0] || '';
    console.log('\n📋 Property type (D8):', propertyType);
    
    // 物件種別に応じてセル位置を決定
    let favoriteCommentCell = '';
    let recommendedCommentsRange = '';
    
    if (propertyType === '土地') {
      favoriteCommentCell = 'B53';
      recommendedCommentsRange = 'B63:L79';
    } else if (propertyType === '戸建') {
      favoriteCommentCell = 'B142';
      recommendedCommentsRange = 'B152:L166';
    } else if (propertyType === 'マンション') {
      favoriteCommentCell = 'B150';
      recommendedCommentsRange = 'B149:L163';
    } else {
      console.error('❌ Unknown property type:', propertyType);
      return;
    }
    
    console.log('\n🔍 Cell positions:');
    console.log('  Favorite comment:', favoriteCommentCell);
    console.log('  Recommended comments:', recommendedCommentsRange);
    
    // お気に入り文言を取得
    const favoriteResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${favoriteCommentCell}`,
    });
    
    const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
    console.log('\n✅ お気に入り文言:');
    console.log(favoriteComment || '(empty)');
    console.log('---');
    
    // アピールポイント（おすすめコメント）を取得
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!${recommendedCommentsRange}`,
    });
    
    const recommendedRows = recommendedResponse.data.values || [];
    console.log('\n✅ アピールポイント（おすすめコメント）:');
    
    // 空でない行のみを抽出
    const recommendedComments: string[] = [];
    recommendedRows.forEach((row, index) => {
      // 行の全セルを結合
      const rowText = row.join(' ').trim();
      if (rowText) {
        recommendedComments.push(rowText);
        console.log(`  [${index + 1}] ${rowText}`);
      }
    });
    
    if (recommendedComments.length === 0) {
      console.log('  (empty)');
    }
    console.log('---');
    
    // 内覧時伝達事項を探す（B列で検索）
    const allDataResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A1:B200`,
    });
    
    const allRows = allDataResponse.data.values || [];
    let propertyAbout = null;
    
    // 「内覧時伝達事項」を含む行を探す
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (row[0] && row[0].includes('内覧時伝達事項')) {
        // 次の行のB列が内覧時伝達事項の値
        if (i + 1 < allRows.length && allRows[i + 1][1]) {
          propertyAbout = allRows[i + 1][1];
        }
        break;
      }
    }
    
    console.log('\n✅ 内覧時伝達事項:');
    console.log(propertyAbout || '(empty)');
    console.log('---');
    
    // パノラマURLを探す
    let panoramaUrl = null;
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (row[0] && row[0].includes('パノラマ')) {
        // 同じ行または次の行にURLがある可能性
        if (row[1] && row[1].includes('http')) {
          panoramaUrl = row[1];
        } else if (i + 1 < allRows.length && allRows[i + 1][1] && allRows[i + 1][1].includes('http')) {
          panoramaUrl = allRows[i + 1][1];
        }
        break;
      }
    }
    
    console.log('\n✅ パノラマURL:');
    console.log(panoramaUrl || '(empty)');
    console.log('---');
    
    // まとめ
    console.log('\n📊 Summary:');
    console.log('  Property type:', propertyType);
    console.log('  Favorite comment:', favoriteComment ? 'YES' : 'NO');
    console.log('  Recommended comments:', recommendedComments.length, 'items');
    console.log('  Property about:', propertyAbout ? 'YES' : 'NO');
    console.log('  Panorama URL:', panoramaUrl ? 'YES' : 'NO');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkAA13453AthomeComments().catch(console.error);
