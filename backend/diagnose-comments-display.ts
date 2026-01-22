/**
 * 公開物件コメント表示診断スクリプト
 * 
 * お気に入り文言とアピールポイントが正しく取得できるかテストします
 */

import axios from 'axios';

// 設定
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/public';
const TEST_PROPERTY_IDS = process.env.TEST_PROPERTY_IDS?.split(',') || [];

interface DiagnosticResult {
  propertyId: string;
  favoriteComment: {
    success: boolean;
    comment: string | null;
    propertyType: string;
    error?: string;
    responseTime: number;
  };
  recommendedComment: {
    success: boolean;
    comments: string[][];
    propertyType: string;
    error?: string;
    responseTime: number;
  };
}

/**
 * お気に入り文言APIをテスト
 */
async function testFavoriteCommentAPI(propertyId: string): Promise<DiagnosticResult['favoriteComment']> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE_URL}/properties/${propertyId}/favorite-comment`, {
      timeout: 30000, // 30秒に延長
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.status === 200,
      comment: response.data.comment,
      propertyType: response.data.propertyType,
      error: response.data.error,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      comment: null,
      propertyType: 'unknown',
      error: error.message,
      responseTime,
    };
  }
}

/**
 * アピールポイントAPIをテスト
 */
async function testRecommendedCommentAPI(propertyId: string): Promise<DiagnosticResult['recommendedComment']> {
  const startTime = Date.now();
  
  try {
    const response = await axios.get(`${API_BASE_URL}/properties/${propertyId}/recommended-comment`, {
      timeout: 30000, // 30秒に延長
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      success: response.status === 200,
      comments: response.data.comments || [],
      propertyType: response.data.propertyType,
      error: response.data.error,
      responseTime,
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      comments: [],
      propertyType: 'unknown',
      error: error.message,
      responseTime,
    };
  }
}

/**
 * 物件の診断を実行
 */
async function diagnoseProperty(propertyId: string): Promise<DiagnosticResult> {
  console.log(`\n診断中: ${propertyId}`);
  console.log('='.repeat(60));
  
  const favoriteComment = await testFavoriteCommentAPI(propertyId);
  const recommendedComment = await testRecommendedCommentAPI(propertyId);
  
  return {
    propertyId,
    favoriteComment,
    recommendedComment,
  };
}

/**
 * 診断結果を表示
 */
function displayResult(result: DiagnosticResult): void {
  console.log(`\n物件ID: ${result.propertyId}`);
  console.log('-'.repeat(60));
  
  // お気に入り文言
  console.log('\n【お気に入り文言】');
  console.log(`  ステータス: ${result.favoriteComment.success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`  物件タイプ: ${result.favoriteComment.propertyType}`);
  console.log(`  レスポンスタイム: ${result.favoriteComment.responseTime}ms`);
  
  if (result.favoriteComment.comment) {
    console.log(`  文言: "${result.favoriteComment.comment}"`);
  } else {
    console.log(`  文言: なし`);
  }
  
  if (result.favoriteComment.error) {
    console.log(`  ⚠️  エラー: ${result.favoriteComment.error}`);
  }
  
  // アピールポイント
  console.log('\n【アピールポイント】');
  console.log(`  ステータス: ${result.recommendedComment.success ? '✅ 成功' : '❌ 失敗'}`);
  console.log(`  物件タイプ: ${result.recommendedComment.propertyType}`);
  console.log(`  レスポンスタイム: ${result.recommendedComment.responseTime}ms`);
  console.log(`  コメント行数: ${result.recommendedComment.comments.length}`);
  
  if (result.recommendedComment.comments.length > 0) {
    console.log(`  コメント内容:`);
    result.recommendedComment.comments.forEach((row, index) => {
      console.log(`    ${index + 1}. ${row.join(' ')}`);
    });
  } else {
    console.log(`  コメント: なし`);
  }
  
  if (result.recommendedComment.error) {
    console.log(`  ⚠️  エラー: ${result.recommendedComment.error}`);
  }
}

/**
 * サマリーを表示
 */
function displaySummary(results: DiagnosticResult[]): void {
  console.log('\n' + '='.repeat(60));
  console.log('診断サマリー');
  console.log('='.repeat(60));
  
  const totalProperties = results.length;
  const favoriteCommentSuccess = results.filter(r => r.favoriteComment.success).length;
  const recommendedCommentSuccess = results.filter(r => r.recommendedComment.success).length;
  const favoriteCommentWithData = results.filter(r => r.favoriteComment.comment).length;
  const recommendedCommentWithData = results.filter(r => r.recommendedComment.comments.length > 0).length;
  
  console.log(`\n総物件数: ${totalProperties}`);
  console.log(`\nお気に入り文言:`);
  console.log(`  API成功: ${favoriteCommentSuccess}/${totalProperties}`);
  console.log(`  データあり: ${favoriteCommentWithData}/${totalProperties}`);
  
  console.log(`\nアピールポイント:`);
  console.log(`  API成功: ${recommendedCommentSuccess}/${totalProperties}`);
  console.log(`  データあり: ${recommendedCommentWithData}/${totalProperties}`);
  
  // パフォーマンス統計
  const avgFavoriteTime = results.reduce((sum, r) => sum + r.favoriteComment.responseTime, 0) / totalProperties;
  const avgRecommendedTime = results.reduce((sum, r) => sum + r.recommendedComment.responseTime, 0) / totalProperties;
  
  console.log(`\n平均レスポンスタイム:`);
  console.log(`  お気に入り文言: ${avgFavoriteTime.toFixed(0)}ms`);
  console.log(`  アピールポイント: ${avgRecommendedTime.toFixed(0)}ms`);
  
  // 問題の特定
  console.log(`\n問題の特定:`);
  
  const favoriteCommentErrors = results.filter(r => !r.favoriteComment.success);
  const recommendedCommentErrors = results.filter(r => !r.recommendedComment.success);
  
  if (favoriteCommentErrors.length > 0) {
    console.log(`  ❌ お気に入り文言APIエラー: ${favoriteCommentErrors.length}件`);
    favoriteCommentErrors.forEach(r => {
      console.log(`     - ${r.propertyId}: ${r.favoriteComment.error}`);
    });
  } else {
    console.log(`  ✅ お気に入り文言APIは正常`);
  }
  
  if (recommendedCommentErrors.length > 0) {
    console.log(`  ❌ アピールポイントAPIエラー: ${recommendedCommentErrors.length}件`);
    recommendedCommentErrors.forEach(r => {
      console.log(`     - ${r.propertyId}: ${r.recommendedComment.error}`);
    });
  } else {
    console.log(`  ✅ アピールポイントAPIは正常`);
  }
  
  // データがない物件
  const noFavoriteComment = results.filter(r => r.favoriteComment.success && !r.favoriteComment.comment);
  const noRecommendedComment = results.filter(r => r.recommendedComment.success && r.recommendedComment.comments.length === 0);
  
  if (noFavoriteComment.length > 0) {
    console.log(`  ℹ️  お気に入り文言データなし: ${noFavoriteComment.length}件`);
  }
  
  if (noRecommendedComment.length > 0) {
    console.log(`  ℹ️  アピールポイントデータなし: ${noRecommendedComment.length}件`);
  }
  
  // 推奨事項
  console.log(`\n推奨事項:`);
  
  if (favoriteCommentErrors.length > 0 || recommendedCommentErrors.length > 0) {
    console.log(`  1. バックエンドログを確認してエラーの詳細を調査`);
    console.log(`  2. スプレッドシートURLが正しく設定されているか確認`);
    console.log(`  3. Google Sheets API認証が正しく設定されているか確認`);
  }
  
  if (noFavoriteComment.length > 0 || noRecommendedComment.length > 0) {
    console.log(`  1. スプレッドシートの該当セル/セル範囲にデータが入力されているか確認`);
    console.log(`  2. 物件タイプが正しく設定されているか確認`);
  }
  
  if (avgFavoriteTime > 2000 || avgRecommendedTime > 2000) {
    console.log(`  ⚠️  レスポンスタイムが遅い（> 2秒）`);
    console.log(`     - Redisキャッシュが正しく動作しているか確認`);
    console.log(`     - Google Sheets APIのレート制限に達していないか確認`);
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  console.log('公開物件コメント表示診断スクリプト');
  console.log('='.repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);
  
  // テスト対象の物件IDを取得
  let propertyIds = TEST_PROPERTY_IDS;
  
  if (propertyIds.length === 0) {
    console.log('\n⚠️  TEST_PROPERTY_IDS環境変数が設定されていません');
    console.log('使用方法:');
    console.log('  TEST_PROPERTY_IDS="uuid1,uuid2,uuid3" ts-node backend/diagnose-comments-display.ts');
    console.log('\nまたは、コマンドライン引数で指定:');
    console.log('  ts-node backend/diagnose-comments-display.ts uuid1 uuid2 uuid3');
    
    // コマンドライン引数から取得
    propertyIds = process.argv.slice(2);
    
    if (propertyIds.length === 0) {
      console.log('\n❌ 物件IDが指定されていません');
      process.exit(1);
    }
  }
  
  console.log(`\nテスト対象物件数: ${propertyIds.length}`);
  console.log(`物件ID: ${propertyIds.join(', ')}`);
  
  // 診断実行
  const results: DiagnosticResult[] = [];
  
  for (const propertyId of propertyIds) {
    const result = await diagnoseProperty(propertyId);
    results.push(result);
    displayResult(result);
  }
  
  // サマリー表示
  displaySummary(results);
  
  console.log('\n診断完了');
}

// 実行
main().catch(error => {
  console.error('診断スクリプトエラー:', error);
  process.exit(1);
});

