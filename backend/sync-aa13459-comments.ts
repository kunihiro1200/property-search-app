import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const CELL_MAPPING = {
  land: {
    favoriteComment: 'B53',
    recommendedComments: 'B63:L79',
  },
  detached_house: {
    favoriteComment: 'B142',
    recommendedComments: 'B152:L166',
  },
  apartment: {
    favoriteComment: 'B150',
    recommendedComments: 'B149:L163',
  },
};

async function syncAA13459Comments() {
  const propertyNumber = 'AA13459';
  
  console.log(`\n=== ${propertyNumber} のおすすめコメントを同期 ===\n`);
  
  // 1. Google Sheets認証
  const credentials = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  // 2. 業務リストからスプレッドシートIDを取得
  const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  console.log(`1. 業務リストからスプレッドシートURLを検索...`);
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: gyomuListSpreadsheetId,
    range: '業務依頼!A:D',
  });
  
  const rows = response.data.values || [];
  let spreadsheetId: string | null = null;
  
  for (const row of rows) {
    if (row[0] === propertyNumber) {
      const spreadsheetUrl = row[3];
      if (spreadsheetUrl) {
        const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          spreadsheetId = match[1];
          console.log(`   ✅ スプレッドシートID: ${spreadsheetId}`);
        }
      }
      break;
    }
  }
  
  if (!spreadsheetId) {
    console.log(`   ❌ スプレッドシートURLが見つかりません`);
    return;
  }
  
  // 3. Athomeシートからデータを取得（土地用のセル位置を使用）
  const propertyType = 'land'; // AA13459は土地
  const cellPositions = CELL_MAPPING[propertyType];
  
  console.log(`\n2. Athomeシートからデータを取得...`);
  console.log(`   - 物件種別: ${propertyType}`);
  console.log(`   - お気に入り文言セル: ${cellPositions.favoriteComment}`);
  console.log(`   - おすすめコメントセル: ${cellPositions.recommendedComments}`);
  
  // お気に入り文言
  const favoriteResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `athome!${cellPositions.favoriteComment}`,
  });
  const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
  console.log(`\n   お気に入り文言: ${favoriteComment ? favoriteComment.substring(0, 50) + '...' : '(なし)'}`);
  
  // おすすめコメント
  const recommendedResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `athome!${cellPositions.recommendedComments}`,
  });
  const recommendedRows = recommendedResponse.data.values || [];
  console.log(`\n   おすすめコメント行数: ${recommendedRows.length}`);
  
  const recommendedComments: string[] = [];
  recommendedRows.forEach((row, index) => {
    const text = row.join(' ').trim();
    if (text) {
      recommendedComments.push(text);
      console.log(`   [${index + 1}] ${text.substring(0, 80)}...`);
    }
  });
  
  console.log(`\n   おすすめコメント数: ${recommendedComments.length}`);
  
  // パノラマURL
  const panoramaResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `athome!N1`,
  });
  const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
  console.log(`\n   パノラマURL: ${panoramaUrl || '(なし)'}`);
  
  // 4. データベースに保存
  console.log(`\n3. データベースに保存...`);
  
  const athomeData = panoramaUrl ? [panoramaUrl] : [];
  
  const { error: upsertError } = await supabase
    .from('property_details')
    .upsert({
      property_number: propertyNumber,
      favorite_comment: favoriteComment,
      recommended_comments: recommendedComments,
      athome_data: athomeData,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'property_number'
    });
  
  if (upsertError) {
    console.log(`   ❌ エラー: ${upsertError.message}`);
    return;
  }
  
  console.log(`   ✅ 保存完了`);
  
  // 5. 確認
  console.log(`\n4. 保存後のデータを確認...`);
  const { data: details, error: detailsError } = await supabase
    .from('property_details')
    .select('*')
    .eq('property_number', propertyNumber)
    .single();
  
  if (detailsError) {
    console.log(`   ❌ エラー: ${detailsError.message}`);
    return;
  }
  
  console.log(`   - favorite_comment: ${details.favorite_comment ? details.favorite_comment.substring(0, 50) + '...' : '(なし)'}`);
  console.log(`   - recommended_comments: ${JSON.stringify(details.recommended_comments).substring(0, 100)}...`);
  console.log(`   - recommended_comments数: ${Array.isArray(details.recommended_comments) ? details.recommended_comments.length : 0}`);
  console.log(`   - athome_data: ${JSON.stringify(details.athome_data)}`);
  
  console.log(`\n✅ 同期完了！`);
}

syncAA13459Comments().catch(console.error);
