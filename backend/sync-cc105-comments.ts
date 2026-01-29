// CC105のコメントデータを同期するスクリプト
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { google } from 'googleapis';
import * as fs from 'fs';

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Google Sheets APIクライアントを初期化
let credentials;
if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
} else if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
  const keyPath = path.resolve(__dirname, process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
} else {
  // デフォルトパス
  const keyPath = path.resolve(__dirname, 'google-service-account.json');
  credentials = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
}

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

async function syncCC105Comments() {
  console.log('🔄 Syncing CC105 comment data...\n');

  try {
    // 1. 業務依頼シートからCC105のスプレッドシートIDを取得
    const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
    const gyomuListSheetName = process.env.GYOMU_LIST_SHEET_NAME || '業務依頼';

    console.log('📋 Fetching CC105 spreadsheet ID from 業務依頼シート...');
    const gyomuResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: gyomuListSpreadsheetId,
      range: `${gyomuListSheetName}!A:D`,
    });

    const gyomuRows = gyomuResponse.data.values || [];
    let cc105SpreadsheetId: string | null = null;

    for (const row of gyomuRows) {
      if (row[0] === 'CC105') {
        const spreadsheetUrl = row[3]; // D列: スプシURL
        if (spreadsheetUrl) {
          const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            cc105SpreadsheetId = match[1];
            console.log('✅ Found CC105 spreadsheet ID:', cc105SpreadsheetId);
            break;
          }
        }
      }
    }

    if (!cc105SpreadsheetId) {
      console.error('❌ CC105 spreadsheet ID not found in 業務依頼シート');
      return;
    }

    // 2. CC105の物件タイプを取得
    const { data: propertyListing } = await supabase
      .from('property_listings')
      .select('property_type')
      .eq('property_number', 'CC105')
      .single();

    if (!propertyListing) {
      console.error('❌ CC105 not found in property_listings');
      return;
    }

    const propertyType = propertyListing.property_type;
    console.log('📊 CC105 property type:', propertyType);

    // 3. 物件タイプに応じてセル位置を決定
    let favoriteCommentCell: string;
    let recommendedCommentsRange: string;

    // 物件タイプを英語に変換
    let propertyTypeEn = propertyType;
    if (propertyType === '土地') {
      propertyTypeEn = 'land';
    } else if (propertyType === '戸建' || propertyType === '戸建て') {
      propertyTypeEn = 'detached_house';
    } else if (propertyType === 'マンション') {
      propertyTypeEn = 'apartment';
    }

    if (propertyTypeEn === 'land') {
      favoriteCommentCell = 'athome!B53';
      recommendedCommentsRange = 'athome!B63:L79';
    } else if (propertyTypeEn === 'detached_house') {
      favoriteCommentCell = 'athome!B142';
      recommendedCommentsRange = 'athome!B152:L166';
    } else if (propertyTypeEn === 'apartment') {
      favoriteCommentCell = 'athome!B150';
      recommendedCommentsRange = 'athome!B149:L163';
    } else {
      console.error('❌ Unknown property type:', propertyType);
      return;
    }

    // 4. お気に入り文言を取得
    console.log('📝 Fetching favorite comment from', favoriteCommentCell);
    const favoriteResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: cc105SpreadsheetId,
      range: favoriteCommentCell,
    });
    const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
    console.log('✅ Favorite comment:', favoriteComment ? favoriteComment.substring(0, 50) + '...' : 'NULL');

    // 5. アピールポイントを取得
    console.log('📝 Fetching recommended comments from', recommendedCommentsRange);
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: cc105SpreadsheetId,
      range: recommendedCommentsRange,
    });
    const recommendedRows = recommendedResponse.data.values || [];
    const recommendedComments: string[] = [];

    recommendedRows.forEach(row => {
      const text = row.join(' ').trim();
      if (text) {
        recommendedComments.push(text);
      }
    });
    console.log('✅ Recommended comments:', recommendedComments.length, 'items');

    // 6. パノラマURLを取得
    console.log('📝 Fetching panorama URL from athome!N1');
    const panoramaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: cc105SpreadsheetId,
      range: 'athome!N1',
    });
    const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
    console.log('✅ Panorama URL:', panoramaUrl || 'NULL');

    // 7. データベースに保存
    console.log('\n💾 Saving to database...');
    const { error } = await supabase
      .from('property_details')
      .upsert({
        property_number: 'CC105',
        favorite_comment: favoriteComment,
        recommended_comments: recommendedComments,
        athome_data: panoramaUrl ? [panoramaUrl] : [],
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'property_number'
      });

    if (error) {
      console.error('❌ Error saving to database:', error);
      return;
    }

    console.log('✅ Successfully synced CC105 comment data!');
    console.log('\n📊 Summary:');
    console.log(`  favorite_comment: ${favoriteComment ? 'EXISTS' : 'NULL'}`);
    console.log(`  recommended_comments: ${recommendedComments.length} items`);
    console.log(`  athome_data: ${panoramaUrl ? 'EXISTS' : 'NULL'}`);

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

syncCC105Comments().catch(console.error);
