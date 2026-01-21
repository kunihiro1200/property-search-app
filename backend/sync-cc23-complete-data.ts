// CC23のお気に入り文言とおすすめコメントを同期
import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function syncCC23CompleteData() {
  console.log('=== CC23のお気に入り文言とおすすめコメントを同期 ===\n');
  
  const propertyNumber = 'CC23';
  
  try {
    // 1. 業務リストからスプシURLを取得
    console.log('1. 業務リストからスプシURLを取得中...');
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await gyomuListClient.authenticate();
    
    const headers = await gyomuListClient.getHeaders();
    const propertyNumberIndex = headers.indexOf('物件番号');
    const spreadsheetUrlIndex = headers.indexOf('スプシURL');
    
    const allData = await gyomuListClient.readAll();
    const cc23Row = allData.find(row => row['物件番号'] === propertyNumber);
    
    if (!cc23Row) {
      console.log('❌ 業務リストにCC23が見つかりませんでした');
      return;
    }
    
    const spreadsheetUrl = cc23Row['スプシURL'];
    console.log('✓ スプシURL:', spreadsheetUrl || '（なし）');
    
    // 2. 物件リストからお気に入り文言を取得
    console.log('\n2. 物件リストからお気に入り文言を取得中...');
    const propertyListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
      sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });
    
    await propertyListClient.authenticate();
    
    const propertyHeaders = await propertyListClient.getHeaders();
    const propertyNumberIdx = propertyHeaders.indexOf('物件番号');
    const favoriteCommentIdx = propertyHeaders.indexOf('お気に入り文言');
    
    const propertyListData = await propertyListClient.readAll();
    const cc23PropertyRow = propertyListData.find(row => row['物件番号'] === propertyNumber);
    
    if (!cc23PropertyRow) {
      console.log('❌ 物件リストにCC23が見つかりませんでした');
      return;
    }
    
    const favoriteComment = cc23PropertyRow['お気に入り文言'];
    console.log('✓ お気に入り文言:', favoriteComment || '（なし）');
    
    // 3. 個別物件スプレッドシートからおすすめコメントを取得
    let recommendedComments: string[] = [];
    
    if (spreadsheetUrl) {
      console.log('\n3. 個別物件スプレッドシートからおすすめコメントを取得中...');
      
      // スプレッドシートIDを抽出
      const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!spreadsheetIdMatch) {
        console.log('❌ スプレッドシートIDを抽出できませんでした');
      } else {
        const individualSpreadsheetId = spreadsheetIdMatch[1];
        console.log('  個別スプレッドシートID:', individualSpreadsheetId);
        
        // athomeシートからおすすめコメントを取得
        const athomeClient = new GoogleSheetsClient({
          spreadsheetId: individualSpreadsheetId,
          sheetName: 'athome',
          serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
        });
        
        await athomeClient.authenticate();
        
        // 物件タイプを確認（CC23は土地）
        const propertyType = '土地';
        console.log('  物件タイプ:', propertyType);
        
        // 土地のおすすめコメント範囲: B63:L79
        const range = 'B63:L79';
        console.log('  取得範囲:', range);
        
        const auth = await athomeClient.getAuth();
        const sheets = google.sheets({ version: 'v4', auth });
        
        const response = await sheets.spreadsheets.values.get({
          spreadsheetId: individualSpreadsheetId,
          range: `athome!${range}`,
        });
        
        const values = response.data.values || [];
        console.log(`  取得した行数: ${values.length}`);
        
        // おすすめコメントを抽出（空でない行のみ）
        recommendedComments = values
          .map(row => row.join(' ').trim())
          .filter(comment => comment.length > 0);
        
        console.log(`✓ おすすめコメント: ${recommendedComments.length}件`);
        if (recommendedComments.length > 0) {
          console.log('  最初のコメント:', recommendedComments[0].substring(0, 50) + '...');
        }
      }
    } else {
      console.log('\n3. スプシURLがないため、おすすめコメントはスキップ');
    }
    
    // 4. property_detailsテーブルを更新
    console.log('\n4. property_detailsテーブルを更新中...');
    
    // property_detailsを更新（property_numberで紐付け）
    const { data: updateData, error: updateError } = await supabase
      .from('property_details')
      .update({
        favorite_comment: favoriteComment || null,
        recommended_comments: recommendedComments.length > 0 ? recommendedComments : null,
        updated_at: new Date().toISOString(),
      })
      .eq('property_number', propertyNumber)
      .select();
    
    if (updateError) {
      console.error('❌ 更新エラー:', updateError);
      return;
    }
    
    console.log('✓ 更新完了');
    console.log('  更新されたレコード数:', updateData?.length || 0);
    
    // 5. 確認
    console.log('\n5. 更新後のデータを確認中...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();
    
    if (verifyError || !verifyData) {
      console.log('❌ 確認エラー');
      return;
    }
    
    console.log('✓ 確認完了');
    console.log('  お気に入り文言:', verifyData.favorite_comment || '（なし）');
    console.log('  おすすめコメント:', verifyData.recommended_comments ? `${verifyData.recommended_comments.length}件` : '（なし）');
    console.log('  物件について:', verifyData.property_about || '（なし）');
    
    console.log('\n=== 同期完了 ===');
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error);
    throw error;
  }
}

syncCC23CompleteData().catch(console.error);
