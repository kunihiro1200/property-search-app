import dotenv from 'dotenv';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

/**
 * CC21のおすすめコメントを同期
 */
async function syncCC21Details() {
  console.log('🔄 CC21のおすすめコメントを同期中...\n');

  try {
    // 1. 業務リストからCC21のスプシURLを取得
    const gyomuListClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID!,
      sheetName: '業務依頼',
      serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
    });

    await gyomuListClient.authenticate();
    console.log('✅ 業務リストに接続しました');

    const allRows = await gyomuListClient.readAll();
    const cc21Row = allRows.find(row => row['物件番号'] === 'CC21');

    if (!cc21Row) {
      console.error('❌ 業務リストにCC21が見つかりません');
      return;
    }

    const spreadsheetUrl = cc21Row['スプシURL'];
    console.log('✅ CC21のスプシURL:', spreadsheetUrl);

    if (!spreadsheetUrl) {
      console.error('❌ CC21のスプシURLが設定されていません');
      return;
    }

    // 2. おすすめコメントを取得
    const recommendedCommentService = new RecommendedCommentService();
    
    // 物件タイプを取得（CC21は土地）
    const propertyType = 'land'; // CC21は土地
    
    const result = await recommendedCommentService.getRecommendedComment('CC21', propertyType);

    console.log('✅ おすすめコメント取得結果:');
    console.log('   コメント数:', result.comments ? result.comments.length : 0);
    if (result.comments && result.comments.length > 0) {
      console.log('   最初の行:', result.comments[0]);
    }

    // 3. property_detailsテーブルに保存
    const propertyDetailsService = new PropertyDetailsService();
    const success = await propertyDetailsService.upsertPropertyDetails('CC21', {
      recommended_comments: result.comments
    });

    if (success) {
      console.log('\n✅ CC21のおすすめコメントを保存しました');
    } else {
      console.error('\n❌ CC21のおすすめコメントの保存に失敗しました');
    }

  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

syncCC21Details();
