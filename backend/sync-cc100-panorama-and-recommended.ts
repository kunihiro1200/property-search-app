import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import { JWT } from 'google-auth-library';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncCC100PanoramaAndRecommended() {
  console.log('=== CC100のパノラマURLとおすすめポイントを同期 ===\n');

  try {
    const { GoogleSheetsClient } = await import('./src/services/GoogleSheetsClient');
    
    // Step 1: 業務依頼シートからCC100のスプシURLを取得
    const gyomuListSpreadsheetId = process.env.GYOMU_LIST_SPREADSHEET_ID!;
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: gyomuListSpreadsheetId,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!,
    });

    await gyomuListClient.authenticate();
    console.log('✅ 認証成功\n');

    const allRows = await gyomuListClient.readAll();
    const cc100Row = allRows.find((row: any) => row['物件番号'] === 'CC100');
    
    if (!cc100Row || !cc100Row['スプシURL']) {
      console.log('❌ CC100のスプシURLが見つかりません');
      return;
    }
    
    const spreadsheetUrl = cc100Row['スプシURL'] as string;
    const match = spreadsheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    if (!match) {
      console.log('❌ スプレッドシートIDを抽出できません');
      return;
    }
    
    const individualSpreadsheetId = match[1];
    console.log(`個別スプレッドシートID: ${individualSpreadsheetId}\n`);
    
    // Step 2: 個別スプレッドシートのathomeシートからデータ取得
    const fs = require('fs');
    const keyPath = path.resolve(process.cwd(), process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH!);
    const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));

    const auth = new JWT({
      email: keyFile.client_email,
      key: keyFile.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    await auth.authorize();
    const sheets = google.sheets({ version: 'v4', auth });
    
    // パノラマURL取得
    const panoramaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!N1',
    });
    
    const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
    console.log(`パノラマURL: ${panoramaUrl || '(空)'}\n`);
    
    // 物件種別を確認
    const propertyType = cc100Row['種別'] || cc100Row['物件種別'] || null;
    console.log(`物件種別: ${propertyType}\n`);
    
    // 物件種別に応じたおすすめポイントの範囲を決定
    let recommendedRange = '';
    if (propertyType === '土地') {
      recommendedRange = 'athome!B63:L79';
      console.log('おすすめポイント範囲: B63:L79（土地）\n');
    } else if (propertyType === '戸建て' || propertyType === '戸建' || propertyType === '戸') {
      recommendedRange = 'athome!B152:L166';
      console.log('おすすめポイント範囲: B152:L166（戸建て）\n');
    } else if (propertyType === 'マンション') {
      recommendedRange = 'athome!B149:L163';
      console.log('おすすめポイント範囲: B149:L163（マンション）\n');
    } else {
      console.log(`⚠️  不明な物件種別: ${propertyType}`);
      console.log('デフォルトで戸建ての範囲を使用します\n');
      recommendedRange = 'athome!B152:L166';
    }
    
    // おすすめポイントを取得
    const recommendedResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: recommendedRange,
    });
    
    const recommendedRows = recommendedResponse.data.values || [];
    const recommendedComments: string[] = [];
    
    console.log('取得したおすすめポイント:');
    for (let i = 0; i < recommendedRows.length; i++) {
      const row = recommendedRows[i];
      const comment = row.filter((cell: any) => cell && String(cell).trim().length > 0).join(' ');
      if (comment.trim().length > 0) {
        console.log(`  ${i + 1}. ${comment}`);
        recommendedComments.push(comment);
      }
    }
    
    console.log(`\n合計: ${recommendedComments.length}件のおすすめポイント\n`);
    
    // Step 3: データベースに保存
    console.log('Step 3: データベースに保存\n');
    
    // athome_dataを構築（パノラマURLは2番目の要素）
    const athomeData = [null, panoramaUrl];
    
    // property_detailsを更新
    const { data: updateData, error: updateError } = await supabase
      .from('property_details')
      .update({
        athome_data: athomeData,
        recommended_comments: recommendedComments,
        updated_at: new Date().toISOString(),
      })
      .eq('property_number', 'CC100');
    
    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }
    
    console.log('✅ データベースに保存しました\n');
    
    // Step 4: 確認
    console.log('Step 4: 保存結果を確認\n');
    
    const { data: details, error: detailsError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', 'CC100')
      .single();
    
    if (detailsError) {
      console.error('❌ 確認エラー:', detailsError);
      return;
    }
    
    console.log('保存されたデータ:');
    console.log(`  athome_data: ${JSON.stringify(details.athome_data)}`);
    console.log(`  パノラマURL (athome_data[1]): ${details.athome_data?.[1] || '(空)'}`);
    console.log(`  recommended_comments: ${details.recommended_comments?.length || 0}件`);
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
  }
}

syncCC100PanoramaAndRecommended()
  .then(() => {
    console.log('\n✅ 同期完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
