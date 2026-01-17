import * as dotenv from 'dotenv';
import { ReplicateImageCleanupService } from './src/services/ReplicateImageCleanupService';

dotenv.config();

async function testSetup() {
  console.log('🔍 Replicate設定テスト\n');

  // 1. 環境変数チェック
  console.log('1. 環境変数チェック:');
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) {
    console.log('   ❌ REPLICATE_API_TOKEN が設定されていません');
    return;
  }
  console.log(`   ✅ Token: ${token.substring(0, 20)}...`);

  // 2. サービス初期化チェック
  console.log('\n2. サービス初期化チェック:');
  try {
    new ReplicateImageCleanupService();
    console.log('   ✅ ReplicateImageCleanupService が正常に初期化されました');
  } catch (error: any) {
    console.log('   ❌ エラー:', error.message);
    return;
  }

  console.log('\n✨ セットアップ完了！');
  console.log('\n次のステップ:');
  console.log('  npm run cleanup-images -- --folderId=1uBUCJ17FQ5fAjfvCrZbwcn4QT3fj2Sn3');
}

testSetup().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
