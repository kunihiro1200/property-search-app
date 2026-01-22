import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { google } from 'googleapis';

dotenv.config();

async function syncCC23() {
  try {
    console.log('🔄 CC23のデータを正しいスキーマで同期中...\n');

    const supabaseUrl = process.env.SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 業務リストから情報を取得
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    const gyomuData = await gyomuListClient.readAll();

    // CC23の行を探す
    const cc23Row = gyomuData.find(row => row['物件番号'] === 'CC23');

    if (!cc23Row) {
      console.error('❌ 業務リストにCC23が見つかりません');
      return;
    }

    console.log('✅ 業務リストでCC23を発見');
    const spreadsheetUrl = cc23Row['スプシURL'];
    console.log('スプシURL:', spreadsheetUrl);

    if (!spreadsheetUrl) {
      console.error('❌ スプシURLが設定されていません');
      return;
    }

    // スプレッドシートIDを抽出
    const spreadsheetIdMatch = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    if (!spreadsheetIdMatch) {
      console.error('❌ スプレッドシートIDを抽出できません');
      return;
    }

    const individualSpreadsheetId = spreadsheetIdMatch[1];
    console.log('個別スプレッドシートID:', individualSpreadsheetId);
    console.log('');

    // 個別スプレッドシートのathomeシートからデータを取得
    const athomeClient = new GoogleSheetsClient({
      spreadsheetId: individualSpreadsheetId,
      sheetName: 'athome',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await athomeClient.authenticate();

    // 物件種別を確認
    const propertyType = '戸建'; // CC23は戸建

    // 物件種別に応じたセル範囲を設定
    let commentRange: string;
    if (propertyType === '土地') {
      commentRange = 'B63:L79';
    } else if (propertyType === '戸建') {
      commentRange = 'B152:L166';
    } else if (propertyType === 'マンション') {
      commentRange = 'B149:L163';
    } else {
      console.error('❌ 不明な物件種別:', propertyType);
      return;
    }

    console.log(`📊 おすすめコメント取得範囲: ${commentRange}`);

    // おすすめコメントを取得（直接APIを使用）
    const sheets = google.sheets({ version: 'v4', auth: athomeClient.getAuth() });
    const commentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: `athome!${commentRange}`,
    });
    
    const commentData = commentResponse.data.values || [];
    const recommendedComments: string[] = [];

    if (commentData && commentData.length > 0) {
      commentData.forEach((row: any[]) => {
        if (row && row.length > 0) {
          const comment = row.join(' ').trim();
          if (comment) {
            recommendedComments.push(comment);
          }
        }
      });
    }

    console.log(`✅ おすすめコメント取得: ${recommendedComments.length}件`);
    recommendedComments.forEach((comment, index) => {
      console.log(`  ${index + 1}. ${comment.substring(0, 50)}...`);
    });
    console.log('');

    // お気に入り文言を取得（B列の「お気に入り文言」セクション）
    const favoriteCommentResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!B1:B200',
    });
    const favoriteCommentData = favoriteCommentResponse.data.values || [];
    let favoriteComment = '';
    
    if (favoriteCommentData) {
      // 「お気に入り文言」というラベルを探す
      const favoriteIndex = favoriteCommentData.findIndex((row: any[]) => 
        row[0] && row[0].toString().includes('お気に入り文言')
      );
      
      if (favoriteIndex !== -1 && favoriteIndex + 1 < favoriteCommentData.length) {
        favoriteComment = favoriteCommentData[favoriteIndex + 1][0] || '';
      }
    }

    console.log('お気に入り文言:', favoriteComment || '(なし)');
    console.log('');

    // パノラマURLを取得
    const panoramaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId: individualSpreadsheetId,
      range: 'athome!B1:B200',
    });
    const panoramaData = panoramaResponse.data.values || [];
    let panoramaUrl = '';
    
    if (panoramaData) {
      const panoramaIndex = panoramaData.findIndex((row: any[]) => 
        row[0] && row[0].toString().includes('パノラマ')
      );
      
      if (panoramaIndex !== -1 && panoramaIndex + 1 < panoramaData.length) {
        panoramaUrl = panoramaData[panoramaIndex + 1][0] || '';
      }
    }

    console.log('パノラマURL:', panoramaUrl || '(なし)');
    console.log('');

    // property_detailsを更新
    console.log('💾 property_detailsを更新中...');

    const updateData: any = {
      recommended_comments: recommendedComments,
      updated_at: new Date().toISOString(),
    };

    if (favoriteComment) {
      updateData.favorite_comment = favoriteComment;
    }

    // athome_dataにパノラマURLを保存
    if (panoramaUrl) {
      updateData.athome_data = {
        panorama_url: panoramaUrl,
      };
    }

    const { data, error } = await supabase
      .from('property_details')
      .update(updateData)
      .eq('property_number', 'CC23')
      .select();

    if (error) {
      console.error('❌ 更新エラー:', error.message);
      return;
    }

    console.log('✅ property_details更新成功');
    console.log('');
    console.log('=== 更新後のデータ ===');
    console.log('おすすめコメント数:', recommendedComments.length);
    console.log('お気に入り文言:', favoriteComment ? '設定済み' : '未設定');
    console.log('パノラマURL:', panoramaUrl ? '設定済み' : '未設定');

  } catch (error: any) {
    console.error('❌ エラーが発生しました:', error.message);
    console.error(error.stack);
  }
}

syncCC23();
