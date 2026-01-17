/**
 * デプロイ前チェックスクリプト
 * 
 * 本番環境へのデプロイ前に、すべての機能が正常に動作することを確認します。
 */

import { createClient } from '@supabase/supabase-js';
import { FavoriteCommentService } from './src/services/FavoriteCommentService';
import { RecommendedCommentService } from './src/services/RecommendedCommentService';
import { getRedisClient } from './src/config/redis';
import * as dotenv from 'dotenv';

// 環境変数を読み込み
dotenv.config();

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: CheckResult[] = [];

/**
 * 環境変数のチェック
 */
async function checkEnvironmentVariables(): Promise<CheckResult> {
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'GOOGLE_SERVICE_ACCOUNT_KEY_PATH',
  ];

  const optionalVars = [
    'REDIS_HOST',
    'REDIS_PORT',
  ];

  const missingRequired = requiredVars.filter(varName => !process.env[varName]);
  const missingOptional = optionalVars.filter(varName => !process.env[varName]);

  if (missingRequired.length > 0) {
    return {
      name: '環境変数チェック',
      status: 'FAIL',
      message: `必須の環境変数が設定されていません: ${missingRequired.join(', ')}`,
    };
  }

  if (missingOptional.length > 0) {
    return {
      name: '環境変数チェック',
      status: 'WARN',
      message: `オプションの環境変数が設定されていません（機能は制限されます）: ${missingOptional.join(', ')}`,
    };
  }

  return {
    name: '環境変数チェック',
    status: 'PASS',
    message: 'すべての必須環境変数が設定されています',
  };
}

/**
 * データベース接続のチェック
 */
async function checkDatabaseConnection(): Promise<CheckResult> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('property_listings')
      .select('id')
      .limit(1);

    if (error) {
      return {
        name: 'データベース接続チェック',
        status: 'FAIL',
        message: `データベース接続エラー: ${error.message}`,
      };
    }

    return {
      name: 'データベース接続チェック',
      status: 'PASS',
      message: 'データベースに正常に接続できました',
    };
  } catch (error: any) {
    return {
      name: 'データベース接続チェック',
      status: 'FAIL',
      message: `データベース接続エラー: ${error.message}`,
    };
  }
}

/**
 * Redis接続のチェック
 */
async function checkRedisConnection(): Promise<CheckResult> {
  try {
    // Redis環境変数のチェック
    if (!process.env.REDIS_HOST || !process.env.REDIS_PORT) {
      return {
        name: 'Redis接続チェック',
        status: 'WARN',
        message: 'Redis環境変数が設定されていません（キャッシュは無効化されます）',
      };
    }

    const redisClient = getRedisClient();
    await redisClient.ping();

    return {
      name: 'Redis接続チェック',
      status: 'PASS',
      message: 'Redisに正常に接続できました',
    };
  } catch (error: any) {
    return {
      name: 'Redis接続チェック',
      status: 'WARN',
      message: `Redis接続エラー（キャッシュは無効化されます）: ${error.message}`,
    };
  }
}

/**
 * Google Sheets API認証のチェック
 */
async function checkGoogleSheetsAuth(): Promise<CheckResult> {
  try {
    const fs = require('fs');
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

    if (!keyPath) {
      return {
        name: 'Google Sheets API認証チェック',
        status: 'FAIL',
        message: 'GOOGLE_SERVICE_ACCOUNT_KEY_PATH が設定されていません',
      };
    }

    if (!fs.existsSync(keyPath)) {
      return {
        name: 'Google Sheets API認証チェック',
        status: 'FAIL',
        message: `サービスアカウントキーファイルが見つかりません: ${keyPath}`,
      };
    }

    const keyContent = fs.readFileSync(keyPath, 'utf8');
    const keyJson = JSON.parse(keyContent);

    if (!keyJson.client_email || !keyJson.private_key) {
      return {
        name: 'Google Sheets API認証チェック',
        status: 'FAIL',
        message: 'サービスアカウントキーファイルの形式が不正です',
      };
    }

    return {
      name: 'Google Sheets API認証チェック',
      status: 'PASS',
      message: 'Google Sheets API認証情報が正しく設定されています',
    };
  } catch (error: any) {
    return {
      name: 'Google Sheets API認証チェック',
      status: 'FAIL',
      message: `認証チェックエラー: ${error.message}`,
    };
  }
}

/**
 * お気に入り文言サービスのチェック
 */
async function checkFavoriteCommentService(): Promise<CheckResult> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // テスト用の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_type, storage_location')
      .not('storage_location', 'is', null)
      .in('property_type', ['land', 'detached_house', 'apartment', '土地', '戸建て', 'マンション'])
      .limit(1);

    if (error || !properties || properties.length === 0) {
      return {
        name: 'お気に入り文言サービスチェック',
        status: 'WARN',
        message: 'テスト用の物件が見つかりませんでした（サポートされている物件タイプ: 土地/戸建て/マンション）',
      };
    }

    const service = new FavoriteCommentService();
    const result = await service.getFavoriteComment(properties[0].id);

    if (result.propertyType === 'unknown') {
      return {
        name: 'お気に入り文言サービスチェック',
        status: 'WARN',
        message: 'サービスは動作していますが、テスト物件でデータを取得できませんでした',
        details: result,
      };
    }

    return {
      name: 'お気に入り文言サービスチェック',
      status: 'PASS',
      message: 'お気に入り文言サービスが正常に動作しています',
      details: result,
    };
  } catch (error: any) {
    return {
      name: 'お気に入り文言サービスチェック',
      status: 'FAIL',
      message: `サービスエラー: ${error.message}`,
    };
  }
}

/**
 * アピールポイントサービスのチェック
 */
async function checkRecommendedCommentService(): Promise<CheckResult> {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // テスト用の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, property_type, storage_location')
      .not('storage_location', 'is', null)
      .in('property_type', ['land', 'detached_house', 'apartment', '土地', '戸建て', 'マンション'])
      .limit(1);

    if (error || !properties || properties.length === 0) {
      return {
        name: 'アピールポイントサービスチェック',
        status: 'WARN',
        message: 'テスト用の物件が見つかりませんでした（サポートされている物件タイプ: 土地/戸建て/マンション）',
      };
    }

    const service = new RecommendedCommentService();
    const result = await service.getRecommendedComment(
      properties[0].property_number,
      properties[0].property_type,
      properties[0].id
    );

    return {
      name: 'アピールポイントサービスチェック',
      status: 'PASS',
      message: 'アピールポイントサービスが正常に動作しています',
      details: {
        propertyType: result.propertyType,
        commentCount: result.comments.length,
      },
    };
  } catch (error: any) {
    return {
      name: 'アピールポイントサービスチェック',
      status: 'FAIL',
      message: `サービスエラー: ${error.message}`,
    };
  }
}

/**
 * すべてのチェックを実行
 */
async function runAllChecks() {
  console.log('='.repeat(80));
  console.log('デプロイ前チェック開始');
  console.log('='.repeat(80));
  console.log('');

  // 各チェックを実行
  results.push(await checkEnvironmentVariables());
  results.push(await checkDatabaseConnection());
  results.push(await checkRedisConnection());
  results.push(await checkGoogleSheetsAuth());
  results.push(await checkFavoriteCommentService());
  results.push(await checkRecommendedCommentService());

  // 結果を表示
  console.log('チェック結果:');
  console.log('-'.repeat(80));

  let passCount = 0;
  let warnCount = 0;
  let failCount = 0;

  results.forEach((result, index) => {
    const statusIcon = {
      PASS: '✅',
      WARN: '⚠️',
      FAIL: '❌',
    }[result.status];

    console.log(`${index + 1}. ${statusIcon} ${result.name}`);
    console.log(`   ${result.message}`);
    if (result.details) {
      console.log(`   詳細: ${JSON.stringify(result.details, null, 2)}`);
    }
    console.log('');

    if (result.status === 'PASS') passCount++;
    if (result.status === 'WARN') warnCount++;
    if (result.status === 'FAIL') failCount++;
  });

  // サマリー
  console.log('='.repeat(80));
  console.log('チェックサマリー');
  console.log('='.repeat(80));
  console.log(`✅ 成功: ${passCount}/${results.length}`);
  console.log(`⚠️  警告: ${warnCount}/${results.length}`);
  console.log(`❌ 失敗: ${failCount}/${results.length}`);
  console.log('');

  // 判定
  if (failCount > 0) {
    console.log('❌ デプロイ前チェック失敗');
    console.log('失敗した項目を修正してから再度チェックしてください。');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  デプロイ前チェック完了（警告あり）');
    console.log('警告項目を確認してください。問題なければデプロイ可能です。');
    process.exit(0);
  } else {
    console.log('✅ デプロイ前チェック完了');
    console.log('すべてのチェックに合格しました。デプロイ可能です。');
    process.exit(0);
  }
}

// チェックを実行
runAllChecks().catch((error) => {
  console.error('チェック実行中にエラーが発生しました:', error);
  process.exit(1);
});
