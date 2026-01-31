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

async function checkAA13459AthomeSheet() {
  const propertyNumber = 'AA13459';
  
  console.log(`\n=== ${propertyNumber} のAthomeシートを確認 ===\n`);
  
  // 1. 物件種別を確認
  const { data: listing, error: listingError } = await supabase
    .from('property_listings')
    .select('id, property_number, property_type')
    .eq('property_number', propertyNumber)
    .single();
  
  if (listingError || !listing) {
    console.log(`❌ 物件が見つかりません: ${listingError?.message}`);
    return;
  }
  
  console.log(`1. 物件情報:`);
  console.log(`   - property_number: ${listing.property_number}`);
  console.log(`   - property_type: ${listing.property_type}`);
  
  // 2. 業務リストからスプレッドシートIDを取得
  const credentials = JSON.parse(fs.readFileSync('./google-service-account.json', 'utf-8'));
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  
  const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  console.log(`\n2. 業務リストからスプレッドシートURLを検索...`);
  
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
          console.log(`   ✅ スプレッドシートURL: ${spreadsheetUrl}`);
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
  
  // 3. Athomeシートからデータを取得
  const propertyType = listing.property_type as 'land' | 'detached_house' | 'apartment';
  const cellPositions = CELL_MAPPING[propertyType];
  
  console.log(`\n3. Athomeシートからデータを取得...`);
  console.log(`   - 物件種別: ${propertyType}`);
  console.log(`   - お気に入り文言セル: ${cellPositions.favoriteComment}`);
  console.log(`   - おすすめコメントセル: ${cellPositions.recommendedComments}`);
  
  try {
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
    
  } catch (error: any) {
    console.log(`   ❌ エラー: ${error.message}`);
  }
}

checkAA13459AthomeSheet().catch(console.error);
