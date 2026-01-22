/**
 * AA13226 画像表示問題の診断
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseAA13226Images() {
  console.log('=== AA13226 画像表示問題の診断 ===\n');

  try {
    // AA13226のデータを取得
    console.log('📊 Step 1: AA13226のデータを取得');
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA13226')
      .single();

    if (error) {
      console.log('❌ エラー:', error.message);
      return;
    }

    if (!property) {
      console.log('❌ AA13226が見つかりません');
      return;
    }

    console.log('✅ AA13226が見つかりました\n');
    console.log('物件情報:');
    console.log(`  物件番号: ${property.property_number}`);
    console.log(`  物件タイプ: ${property.property_type}`);
    console.log(`  所在地: ${property.address}`);
    console.log(`  ATBB状態: ${property.atbb_status}`);
    console.log(`  image_url: ${property.image_url || '(未設定)'}`);
    console.log(`  storage_location: ${property.storage_location || '(未設定)'}`);
    console.log(`  hidden_images: ${property.hidden_images ? JSON.stringify(property.hidden_images) : '(なし)'}`);

    // work_tasksテーブルからstorage_urlを確認
    console.log('\n📊 Step 2: work_tasksテーブルを確認');
    const { data: workTask, error: workTaskError } = await supabase
      .from('work_tasks')
      .select('*')
      .eq('property_number', 'AA13226')
      .single();

    if (workTaskError) {
      console.log('⚠️  work_tasksにデータがありません:', workTaskError.message);
    } else if (workTask) {
      console.log('✅ work_tasksにデータがあります');
      console.log(`  storage_url: ${workTask.storage_url || '(未設定)'}`);
    }

    // 格納先URLの確認
    console.log('\n📊 Step 3: 格納先URLの確認');
    const storageUrl = property.storage_location || workTask?.storage_url;
    
    if (!storageUrl) {
      console.log('❌ 格納先URLが設定されていません');
      console.log('\n💡 解決策:');
      console.log('  1. property_listings.storage_location を設定する');
      console.log('  2. または work_tasks.storage_url を設定する');
      return;
    }

    console.log(`✅ 格納先URL: ${storageUrl}`);

    // APIエンドポイントの確認
    console.log('\n📊 Step 4: APIエンドポイントの確認');
    console.log(`  物件詳細: GET /api/public/properties/${property.id}`);
    console.log(`  画像一覧: GET /api/public/properties/${property.id}/images`);
    console.log(`  または: GET /api/public/properties/${property.property_number}/images`);

    // 診断結果のサマリー
    console.log('\n📊 診断結果サマリー');
    console.log('─'.repeat(60));
    
    const issues = [];
    const solutions = [];

    if (!property.storage_location && !workTask?.storage_url) {
      issues.push('❌ 格納先URLが未設定');
      solutions.push('property_listings.storage_location または work_tasks.storage_url を設定');
    }

    if (!property.image_url) {
      issues.push('⚠️  image_urlが未設定');
      solutions.push('サムネイル画像を設定することを推奨');
    }

    if (property.hidden_images && property.hidden_images.length > 0) {
      issues.push(`⚠️  非表示画像が${property.hidden_images.length}件あります`);
      solutions.push('非表示画像を確認してください');
    }

    if (issues.length === 0) {
      console.log('✅ 問題は見つかりませんでした');
      console.log('\n次のステップ:');
      console.log('  1. ブラウザで公開物件サイトを開く');
      console.log(`     http://localhost:5173/public/properties/${property.property_number}`);
      console.log('  2. 開発者ツール（F12）でネットワークタブを確認');
      console.log('  3. 画像APIのレスポンスを確認');
    } else {
      console.log('問題:');
      issues.forEach(issue => console.log(`  ${issue}`));
      console.log('\n解決策:');
      solutions.forEach(solution => console.log(`  ${solution}`));
    }

  } catch (error: any) {
    console.error('❌ 診断中にエラーが発生しました:', error.message);
    console.error(error.stack);
  }

  console.log('\n' + '='.repeat(60));
  console.log('診断完了\n');
}

// 実行
diagnoseAA13226Images()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
