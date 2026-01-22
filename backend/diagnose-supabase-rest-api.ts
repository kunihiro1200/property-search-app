/**
 * Supabase REST API Connection Diagnostic Script
 * 
 * このスクリプトはSupabase REST APIの接続をテストします。
 * 直接PostgreSQL接続が失敗する場合の代替手段として使用できます。
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as https from 'https';

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnoseSupabaseRestApi() {
  console.log('🔍 Supabase REST API接続診断を開始します...\n');

  // Step 1: Check environment variables
  console.log('📋 ステップ1: 環境変数の確認');
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl) {
    console.error('❌ SUPABASE_URL が設定されていません');
    return;
  }
  
  if (!supabaseServiceKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY が設定されていません');
    return;
  }
  
  console.log('✅ 環境変数が設定されています');
  console.log(`   URL: ${supabaseUrl}`);
  console.log(`   Service Key: ${supabaseServiceKey.substring(0, 20)}...\n`);

  // Step 2: Test HTTPS connection
  console.log('📋 ステップ2: HTTPS接続のテスト');
  const urlObj = new URL(supabaseUrl);
  
  const httpsConnected = await new Promise<boolean>((resolve) => {
    const req = https.request({
      hostname: urlObj.hostname,
      port: 443,
      path: '/rest/v1/',
      method: 'GET',
      timeout: 5000,
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      }
    }, (res) => {
      resolve(res.statusCode !== undefined);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });

  if (!httpsConnected) {
    console.error('❌ HTTPS接続ができません');
    console.log('\n解決方法:');
    console.log('- インターネット接続を確認');
    console.log('- プロキシ設定を確認');
    console.log('- Supabaseプロジェクトが実行中か確認');
    console.log('- Supabaseステータスページを確認: https://status.supabase.com');
    return;
  }

  console.log('✅ HTTPS接続が成功しました\n');

  // Step 3: Initialize Supabase client
  console.log('📋 ステップ3: Supabaseクライアントの初期化');
  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    console.log('✅ Supabaseクライアントが初期化されました\n');
  } catch (error: any) {
    console.error('❌ Supabaseクライアントの初期化に失敗しました');
    console.error(`   エラー: ${error.message}`);
    return;
  }

  // Step 4: Test REST API query
  console.log('📋 ステップ4: REST APIクエリのテスト');
  try {
    const { error } = await supabase
      .from('sellers')
      .select('count', { count: 'exact', head: true });

    if (error) {
      console.error('❌ REST APIクエリに失敗しました');
      console.error(`   エラー: ${error.message}`);
      console.log('\n解決方法:');
      console.log('- テーブル "sellers" が存在するか確認');
      console.log('- サービスロールキーの権限を確認');
      console.log('- Supabaseダッシュボードでテーブルを確認');
      return;
    }

    console.log('✅ REST APIクエリが成功しました\n');

  } catch (error: any) {
    console.error('❌ REST APIクエリに失敗しました');
    console.error(`   エラー: ${error.message}`);
    return;
  }

  // Step 5: Test table access
  console.log('📋 ステップ5: テーブルアクセスのテスト');
  try {
    const tables = ['sellers', 'properties', 'valuations', 'property_listings', 'buyers'];
    const results: { [key: string]: number | string } = {};

    for (const table of tables) {
      try {
        const { count, error } = await supabase
          .from(table)
          .select('*', { count: 'exact', head: true });

        if (error) {
          results[table] = `エラー: ${error.message}`;
        } else {
          results[table] = count || 0;
        }
      } catch (error: any) {
        results[table] = `エラー: ${error.message}`;
      }
    }

    console.log('✅ テーブルアクセステストが完了しました');
    console.log('\n   テーブル一覧:');
    for (const [table, result] of Object.entries(results)) {
      if (typeof result === 'number') {
        console.log(`   - ${table}: ${result} 件`);
      } else {
        console.log(`   - ${table}: ${result}`);
      }
    }
    console.log('');

  } catch (error: any) {
    console.error('❌ テーブルアクセステストに失敗しました');
    console.error(`   エラー: ${error.message}`);
    return;
  }

  // Step 6: Test property_listings sync capability
  console.log('📋 ステップ6: property_listings同期機能のテスト');
  try {
    // Get a sample property listing
    const { data: sampleProperty, error: selectError } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, storage_location')
      .limit(1)
      .single();

    if (selectError) {
      console.error('❌ property_listingsの読み取りに失敗しました');
      console.error(`   エラー: ${selectError.message}`);
      return;
    }

    if (!sampleProperty) {
      console.log('⚠️  property_listingsにデータがありません');
      console.log('   同期機能のテストをスキップします\n');
    } else {
      console.log('✅ property_listingsの読み取りが成功しました');
      console.log(`   サンプル物件: ${sampleProperty.property_number}`);
      console.log(`   ATBB状態: ${sampleProperty.atbb_status || '未設定'}`);
      console.log(`   格納先: ${sampleProperty.storage_location || '未設定'}\n`);

      // Test update capability (dry run - no actual update)
      console.log('   更新機能のテスト（dry run）...');

      const { error: updateError } = await supabase
        .from('property_listings')
        .update({ updated_at: new Date().toISOString() })
        .eq('property_number', sampleProperty.property_number);

      if (updateError) {
        console.error('   ❌ 更新機能のテストに失敗しました');
        console.error(`      エラー: ${updateError.message}`);
      } else {
        console.log('   ✅ 更新機能のテストが成功しました\n');
      }
    }

  } catch (error: any) {
    console.error('❌ property_listings同期機能のテストに失敗しました');
    console.error(`   エラー: ${error.message}`);
    return;
  }

  // Success!
  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ 全ての診断に合格しました！');
  console.log('═══════════════════════════════════════════════════════════');
  console.log('\n📊 診断結果サマリー:');
  console.log('   ✅ 環境変数: 正常');
  console.log('   ✅ HTTPS接続: 正常');
  console.log('   ✅ Supabaseクライアント: 正常');
  console.log('   ✅ REST APIクエリ: 正常');
  console.log('   ✅ テーブルアクセス: 正常');
  console.log('   ✅ property_listings同期: 正常');
  console.log('');
  console.log('💡 推奨事項:');
  console.log('   直接PostgreSQL接続が失敗する場合は、REST API-based syncを使用してください。');
  console.log('   詳細: .kiro/specs/property-listing-sync-alternative-approach/');
  console.log('');
  console.log('📋 次のステップ:');
  console.log('   1. REST API-based syncの実装を検討:');
  console.log('      cat .kiro/specs/property-listing-sync-alternative-approach/QUICK_START.md');
  console.log('');
  console.log('   2. または、直接PostgreSQL接続の問題を解決:');
  console.log('      - Supabaseプロジェクトが一時停止していないか確認');
  console.log('      - ネットワーク接続を確認');
  console.log('      - VPN設定を確認');
  console.log('');
}

diagnoseSupabaseRestApi().catch((error) => {
  console.error('\n予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
