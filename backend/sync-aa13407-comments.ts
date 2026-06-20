/**
 * AA13407のコメントデータを同期するスクリプト
 * 
 * 問題: recommended_commentsとathome_dataが空
 * 解決: 個別物件スプレッドシートのathomeシートからデータを取得して同期
 */

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Google Sheets認証
async function getGoogleSheetsClient() {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json';
  const auth = new google.auth.GoogleAuth({
    keyFile: keyPath,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  return google.sheets({ version: 'v4', auth });
}

// 業務依頼シートから個別物件スプレッドシートIDを取得
async function getIndividualSpreadsheetId(propertyNumber: string): Promise<string | null> {
  const sheets = await getGoogleSheetsClient();
  const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: gyomuListSpreadsheetId,
    range: '業務依頼!A:D',
  });
  
  const rows = response.data.values || [];
  
  for (const row of rows) {
    if (row[0] === propertyNumber) {
      const spreadsheetUrl = row[3]; // D列: スプシURL
      if (spreadsheetUrl) {
        const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (match) {
          return match[1];
        }
      }
    }
  }
  
  return null;
}

// athomeシートからコメントデータを取得（戸建て用）
async function fetchCommentsFromAthomeSheet(spreadsheetId: string): Promise<{
  favoriteComment: string | null;
  recommendedComments: string[];
  panoramaUrl: string | null;
}> {
  const sheets = await getGoogleSheetsClient();
  
  // 戸建ての場合のセル位置
  // お気に入り文言: B142
  // アピールポイント: B152:L166
  // パノラマURL: N1
  
  // お気に入り文言を取得
  const favoriteResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'athome!B142',
  });
  const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
  
  // アピールポイントを取得
  const recommendedResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'athome!B152:L166',
  });
  const recommendedRows = recommendedResponse.data.values || [];
  const recommendedComments: string[] = [];
  
  recommendedRows.forEach(row => {
    const text = row.join(' ').trim();
    if (text) {
      recommendedComments.push(text);
    }
  });
  
  // パノラマURLを取得
  const panoramaResponse = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'athome!N1',
  });
  const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
  
  return {
    favoriteComment,
    recommendedComments,
    panoramaUrl,
  };
}

async function main() {
  const propertyNumber = 'AA13407';
  
  console.log(`=== ${propertyNumber} コメントデータ同期 ===\n`);
  
  // 1. 個別物件スプレッドシートIDを取得
  console.log('📋 個別物件スプレッドシートIDを取得中...');
  const spreadsheetId = await getIndividualSpreadsheetId(propertyNumber);
  
  if (!spreadsheetId) {
    console.error(`❌ ${propertyNumber}の個別物件スプレッドシートが見つかりません`);
    return;
  }
  
  console.log(`✅ スプレッドシートID: ${spreadsheetId}\n`);
  
  // 2. athomeシートからコメントデータを取得
  console.log('📋 athomeシートからコメントデータを取得中...');
  const comments = await fetchCommentsFromAthomeSheet(spreadsheetId);
  
  console.log(`\n📊 取得したデータ:`);
  console.log(`  お気に入り文言: ${comments.favoriteComment ? comments.favoriteComment.substring(0, 50) + '...' : '(なし)'}`);
  console.log(`  アピールポイント: ${comments.recommendedComments.length}件`);
  comments.recommendedComments.forEach((comment, i) => {
    console.log(`    ${i + 1}. ${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}`);
  });
  console.log(`  パノラマURL: ${comments.panoramaUrl || '(なし)'}`);
  
  // 3. property_detailsテーブルを更新
  console.log('\n📋 property_detailsテーブルを更新中...');
  
  const updateData: any = {};
  
  if (comments.favoriteComment) {
    updateData.favorite_comment = comments.favoriteComment;
  }
  
  if (comments.recommendedComments.length > 0) {
    updateData.recommended_comments = comments.recommendedComments;
  }
  
  if (comments.panoramaUrl) {
    updateData.athome_data = [comments.panoramaUrl];
  }
  
  if (Object.keys(updateData).length === 0) {
    console.log('⚠️ 更新するデータがありません');
    return;
  }
  
  const { error } = await supabase
    .from('property_details')
    .update(updateData)
    .eq('property_number', propertyNumber);
  
  if (error) {
    console.error(`❌ 更新エラー: ${error.message}`);
    return;
  }
  
  console.log('✅ 更新完了!\n');
  
  // 4. 更新後のデータを確認
  console.log('📋 更新後のデータを確認中...');
  const { data: updatedData } = await supabase
    .from('property_details')
    .select('favorite_comment, recommended_comments, athome_data')
    .eq('property_number', propertyNumber)
    .single();
  
  if (updatedData) {
    console.log(`\n📊 更新後のデータ:`);
    console.log(`  favorite_comment: ${updatedData.favorite_comment ? '✅ 入っている' : '❌ 空'}`);
    console.log(`  recommended_comments: ${updatedData.recommended_comments?.length || 0}件`);
    console.log(`  athome_data: ${updatedData.athome_data?.length || 0}件`);
  }
}

main().catch(console.error);
