/**
 * おすすめコメント機能のテストスクリプト
 * 
 * 実行方法:
 * cd backend
 * npx ts-node test-recommended-comment.ts
 */

import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

async function testRecommendedComment() {
  console.log('=== おすすめコメント機能テスト ===\n');
  
  // 環境変数の確認
  console.log('1. 環境変数の確認:');
  console.log(`   GYOMU_LIST_SPREADSHEET_ID: ${process.env.GYOMU_LIST_SPREADSHEET_ID ? '✓ 設定済み' : '✗ 未設定'}`);
  console.log(`   GOOGLE_SERVICE_ACCOUNT_KEY_PATH: ${process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '✓ 設定済み' : '✗ 未設定'}`);
  console.log('');
  
  if (!process.env.GYOMU_LIST_SPREADSHEET_ID) {
    console.error('エラー: GYOMU_LIST_SPREADSHEET_ID が設定されていません');
    console.log('backend/.env ファイルに以下を追加してください:');
    console.log('GYOMU_LIST_SPREADSHEET_ID=<スプレッドシートID>');
    return;
  }
  
  try {
    console.log('2. RecommendedCommentService の初期化...');
    const service = new RecommendedCommentService();
    console.log('   ✓ 初期化成功\n');
    
    // テストケース1: AA13129（戸建）
    console.log('3. テストケース1: AA13129（戸建）');
    try {
      const result1 = await service.getRecommendedComment('AA13129', '戸建');
      console.log('   結果:');
      console.log(`   - Property Type: ${result1.propertyType}`);
      console.log(`   - Comment: ${result1.comment ? '✓ 取得成功' : '✗ コメントなし'}`);
      if (result1.comment) {
        console.log(`   - コメント内容: "${result1.comment.substring(0, 50)}${result1.comment.length > 50 ? '...' : ''}"`);
      }
    } catch (error: any) {
      console.error(`   ✗ エラー: ${error.message}`);
    }
    console.log('');
    
    // テストケース2: AA13129（土地）
    console.log('4. テストケース2: AA13129（土地）');
    try {
      const result2 = await service.getRecommendedComment('AA13129', '土地');
      console.log('   結果:');
      console.log(`   - Property Type: ${result2.propertyType}`);
      console.log(`   - Comment: ${result2.comment ? '✓ 取得成功' : '✗ コメントなし'}`);
      if (result2.comment) {
        console.log(`   - コメント内容: "${result2.comment.substring(0, 50)}${result2.comment.length > 50 ? '...' : ''}"`);
      }
    } catch (error: any) {
      console.error(`   ✗ エラー: ${error.message}`);
    }
    console.log('');
    
    // テストケース3: AA13129（マンション）
    console.log('5. テストケース3: AA13129（マンション）');
    try {
      const result3 = await service.getRecommendedComment('AA13129', 'マンション');
      console.log('   結果:');
      console.log(`   - Property Type: ${result3.propertyType}`);
      console.log(`   - Comment: ${result3.comment ? '✓ 取得成功' : '✗ コメントなし'}`);
      if (result3.comment) {
        console.log(`   - コメント内容: "${result3.comment.substring(0, 50)}${result3.comment.length > 50 ? '...' : ''}"`);
      }
    } catch (error: any) {
      console.error(`   ✗ エラー: ${error.message}`);
    }
    console.log('');
    
    console.log('=== テスト完了 ===');
    console.log('\n診断結果:');
    console.log('- コメントが取得できた場合: スプレッドシートの設定は正しいです');
    console.log('- "Sheet not found" エラー: 物件番号のシートが存在しません');
    console.log('- コメントがnullの場合: 該当セルが空です');
    console.log('- 認証エラー: サービスアカウントの設定を確認してください');
    
  } catch (error: any) {
    console.error('\n初期化エラー:', error.message);
    console.log('\n考えられる原因:');
    console.log('1. GYOMU_LIST_SPREADSHEET_ID が正しくない');
    console.log('2. GOOGLE_SERVICE_ACCOUNT_KEY_PATH が正しくない');
    console.log('3. サービスアカウントキーファイルが存在しない');
    console.log('4. スプレッドシートがサービスアカウントと共有されていない');
  }
}

// スクリプト実行
testRecommendedComment()
  .then(() => {
    console.log('\nスクリプト終了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n予期しないエラー:', error);
    process.exit(1);
  });
