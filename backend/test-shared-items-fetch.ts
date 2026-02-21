/**
 * 共有データ取得テストスクリプト
 * 
 * Google Sheets APIから共有データを取得できるかテストします。
 */

import { SharedItemsService } from './src/services/SharedItemsService';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込み（backend/.envを明示的に指定）
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testSharedItemsFetch() {
  console.log('=== 共有データ取得テスト開始 ===\n');

  // 環境変数の確認
  console.log('📋 環境変数チェック:');
  console.log('  GOOGLE_SERVICE_ACCOUNT_KEY_PATH:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ? '✅ 設定済み' : '❌ 未設定');
  console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL:', process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ? '✅ 設定済み' : '❌ 未設定');
  console.log('  GOOGLE_PRIVATE_KEY:', process.env.GOOGLE_PRIVATE_KEY ? '✅ 設定済み' : '❌ 未設定');
  console.log('  GOOGLE_SERVICE_ACCOUNT_JSON:', process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? '✅ 設定済み' : '❌ 未設定');
  console.log('');

  try {
    // SharedItemsServiceのインスタンスを作成
    console.log('🔧 SharedItemsServiceを初期化中...');
    const service = new SharedItemsService();

    // 認証
    console.log('🔐 Google Sheets APIに認証中...');
    await service.initialize();
    console.log('✅ 認証成功\n');

    // 全件取得
    console.log('📥 共有データを取得中...');
    const items = await service.getAll();
    console.log(`✅ ${items.length}件のデータを取得しました\n`);

    // 最初の3件を表示
    if (items.length > 0) {
      console.log('📊 最初の3件のデータ:');
      items.slice(0, 3).forEach((item, index) => {
        console.log(`\n  [${index + 1}] ID: ${item.id}`);
        console.log(`      共有場: ${item.sharing_location || '(空)'}`);
        console.log(`      共有日: ${item.sharing_date || '(空)'}`);
        console.log(`      共有できていない: ${item.staff_not_shared || '(空)'}`);
        console.log(`      確認日: ${item.confirmation_date || '(空)'}`);
      });
      console.log('');
    } else {
      console.log('⚠️  データが0件です。スプレッドシートにデータがあるか確認してください。\n');
    }

    // カテゴリー取得
    console.log('📂 カテゴリーを取得中...');
    const categories = await service.getCategories();
    console.log(`✅ ${categories.length}個のカテゴリーを取得しました\n`);

    if (categories.length > 0) {
      console.log('📊 カテゴリー一覧:');
      categories.forEach((category, index) => {
        console.log(`  [${index + 1}] ${category.label}: ${category.count}件`);
      });
      console.log('');
    }

    console.log('=== テスト成功 ===');
    process.exit(0);
  } catch (error: any) {
    console.error('\n❌ エラーが発生しました:');
    console.error('  メッセージ:', error.message);
    if (error.stack) {
      console.error('  スタックトレース:', error.stack);
    }
    console.log('\n=== テスト失敗 ===');
    process.exit(1);
  }
}

// テスト実行
testSharedItemsFetch();
