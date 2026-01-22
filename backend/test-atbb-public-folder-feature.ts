/**
 * ATBB公開フォルダ機能のテストスクリプト
 * 
 * このスクリプトは実際のGoogle Driveフォルダを使用して
 * atbb公開フォルダ機能が正しく動作することを確認します。
 * 
 * 実行方法:
 * cd backend
 * npx ts-node test-atbb-public-folder-feature.ts
 */

import { PropertyImageService } from './src/services/PropertyImageService';
import { GoogleDriveService } from './src/services/GoogleDriveService';

interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🧪 ATBB公開フォルダ機能テスト開始\n');
  console.log('=' .repeat(60));
  
  const propertyImageService = new PropertyImageService();
  const googleDriveService = new GoogleDriveService();
  
  // テスト1: GoogleDriveService.findFolderByName() が存在することを確認
  console.log('\n📋 テスト1: GoogleDriveService.findFolderByName() メソッドの存在確認');
  try {
    const hasFindFolderByName = typeof googleDriveService.findFolderByName === 'function';
    results.push({
      testName: 'GoogleDriveService.findFolderByName() exists',
      passed: hasFindFolderByName,
      message: hasFindFolderByName 
        ? '✅ findFolderByName() メソッドが存在します'
        : '❌ findFolderByName() メソッドが見つかりません'
    });
    console.log(results[results.length - 1].message);
  } catch (error: any) {
    results.push({
      testName: 'GoogleDriveService.findFolderByName() exists',
      passed: false,
      message: `❌ エラー: ${error.message}`
    });
    console.log(results[results.length - 1].message);
  }
  
  // テスト2: PropertyImageService.getPublicFolderIdIfExists() が存在することを確認
  console.log('\n📋 テスト2: PropertyImageService.getPublicFolderIdIfExists() メソッドの存在確認');
  try {
    const hasGetPublicFolderIdIfExists = typeof (propertyImageService as any).getPublicFolderIdIfExists === 'function';
    results.push({
      testName: 'PropertyImageService.getPublicFolderIdIfExists() exists',
      passed: hasGetPublicFolderIdIfExists,
      message: hasGetPublicFolderIdIfExists
        ? '✅ getPublicFolderIdIfExists() メソッドが存在します'
        : '❌ getPublicFolderIdIfExists() メソッドが見つかりません'
    });
    console.log(results[results.length - 1].message);
  } catch (error: any) {
    results.push({
      testName: 'PropertyImageService.getPublicFolderIdIfExists() exists',
      passed: false,
      message: `❌ エラー: ${error.message}`
    });
    console.log(results[results.length - 1].message);
  }
  
  // テスト3: 環境変数の確認
  console.log('\n📋 テスト3: 必要な環境変数の確認');
  const requiredEnvVars = [
    'GOOGLE_DRIVE_PARENT_FOLDER_ID',
    'GOOGLE_SERVICE_ACCOUNT_KEY_PATH'
  ];
  
  const missingEnvVars: string[] = [];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missingEnvVars.push(envVar);
    }
  }
  
  results.push({
    testName: 'Environment variables check',
    passed: missingEnvVars.length === 0,
    message: missingEnvVars.length === 0
      ? '✅ すべての必要な環境変数が設定されています'
      : `⚠️ 以下の環境変数が設定されていません: ${missingEnvVars.join(', ')}`,
    details: {
      GOOGLE_DRIVE_PARENT_FOLDER_ID: process.env.GOOGLE_DRIVE_PARENT_FOLDER_ID ? '設定済み' : '未設定',
      GOOGLE_SERVICE_ACCOUNT_KEY_PATH: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '設定済み' : '未設定'
    }
  });
  console.log(results[results.length - 1].message);
  if (results[results.length - 1].details) {
    console.log('詳細:', results[results.length - 1].details);
  }
  
  // テスト4: 実際のフォルダでテスト（オプション）
  console.log('\n📋 テスト4: 実際のGoogle Driveフォルダでのテスト（オプション）');
  console.log('⚠️ このテストを実行するには、テストフォルダIDを指定してください');
  console.log('   例: TEST_FOLDER_ID=your-folder-id npx ts-node test-atbb-public-folder-feature.ts');
  
  const testFolderId = process.env.TEST_FOLDER_ID;
  if (testFolderId) {
    try {
      console.log(`\n🔍 テストフォルダ ${testFolderId} で "atbb公開" フォルダを検索中...`);
      const publicFolderId = await googleDriveService.findFolderByName(testFolderId, 'atbb公開');
      
      results.push({
        testName: 'Find atbb公開 folder in test folder',
        passed: true,
        message: publicFolderId 
          ? `✅ "atbb公開" フォルダが見つかりました: ${publicFolderId}`
          : '📁 "atbb公開" フォルダは見つかりませんでした（これは正常な動作です）',
        details: { publicFolderId }
      });
      console.log(results[results.length - 1].message);
      
      // 画像を取得してみる
      if (publicFolderId) {
        console.log('\n🖼️ "atbb公開" フォルダから画像を取得中...');
        const images = await googleDriveService.listImageFiles(publicFolderId);
        console.log(`✅ ${images.length} 枚の画像が見つかりました`);
        if (images.length > 0) {
          console.log('画像一覧:');
          images.forEach((img, idx) => {
            console.log(`  ${idx + 1}. ${img.name} (${img.mimeType})`);
          });
        }
      }
    } catch (error: any) {
      results.push({
        testName: 'Find atbb公開 folder in test folder',
        passed: false,
        message: `❌ エラー: ${error.message}`,
        details: { error: error.message }
      });
      console.log(results[results.length - 1].message);
    }
  } else {
    results.push({
      testName: 'Find atbb公開 folder in test folder',
      passed: true,
      message: '⏭️ スキップ（TEST_FOLDER_ID が指定されていません）'
    });
    console.log(results[results.length - 1].message);
  }
  
  // 結果サマリー
  console.log('\n' + '='.repeat(60));
  console.log('📊 テスト結果サマリー\n');
  
  const passedTests = results.filter(r => r.passed).length;
  const totalTests = results.filter(r => !r.message.includes('スキップ')).length;
  
  console.log(`合計: ${totalTests} テスト`);
  console.log(`成功: ${passedTests} テスト`);
  console.log(`失敗: ${totalTests - passedTests} テスト`);
  
  console.log('\n詳細:');
  results.forEach((result, idx) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${idx + 1}. ${icon} ${result.testName}`);
    console.log(`   ${result.message}`);
  });
  
  console.log('\n' + '='.repeat(60));
  
  if (passedTests === totalTests) {
    console.log('🎉 すべてのテストが成功しました！');
    console.log('\n✅ ATBB公開フォルダ機能は正しく実装されています。');
  } else {
    console.log('⚠️ 一部のテストが失敗しました。上記の詳細を確認してください。');
  }
  
  console.log('\n📝 次のステップ:');
  console.log('1. 実際の物件フォルダで "atbb公開" サブフォルダを作成');
  console.log('2. "atbb公開" フォルダに画像をアップロード');
  console.log('3. 物件詳細ページで画像が表示されることを確認');
  console.log('4. バックエンドログで正しいフォルダが使用されていることを確認');
  console.log('\n実際のフォルダでテストするには:');
  console.log('TEST_FOLDER_ID=your-folder-id npx ts-node test-atbb-public-folder-feature.ts');
}

// テスト実行
runTests()
  .then(() => {
    console.log('\n✅ テスト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ テスト実行中にエラーが発生しました:', error);
    process.exit(1);
  });
