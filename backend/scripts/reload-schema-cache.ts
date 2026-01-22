/**
 * Supabase PostgRESTのスキーマキャッシュを強制的に再読み込みするスクリプト
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません');
  process.exit(1);
}

async function reloadSchemaCache() {
  console.log('🔄 Supabaseスキーマキャッシュの再読み込みを開始します...');
  console.log(`📍 プロジェクトURL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 1. property_inquiriesテーブルが存在するか確認
    console.log('\n1️⃣ property_inquiriesテーブルの存在確認...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('property_inquiries')
      .select('id')
      .limit(1);

    if (tableError) {
      console.error('❌ property_inquiriesテーブルへのアクセスエラー:', tableError);
      
      // スキーマキャッシュの再読み込みを試みる
      console.log('\n2️⃣ スキーマキャッシュの再読み込みを試みます...');
      const { error: notifyError } = await supabase.rpc('notify_pgrst_reload');
      
      if (notifyError) {
        console.log('⚠️ notify_pgrst_reload関数が存在しません。直接SQLで実行してください:');
        console.log('   NOTIFY pgrst, \'reload schema\';');
        console.log('\n📋 Supabaseダッシュボードで実行する手順:');
        console.log('   1. https://supabase.com/dashboard/project/fzcuexscuwhoywcicdqq');
        console.log('   2. 左サイドバーの「SQL Editor」をクリック');
        console.log('   3. 上記のSQLを実行');
        console.log('   4. バックエンドを再起動');
      } else {
        console.log('✅ スキーマキャッシュの再読み込みを通知しました');
        console.log('⏳ 数秒待ってからバックエンドを再起動してください');
      }
    } else {
      console.log('✅ property_inquiriesテーブルにアクセスできました');
      console.log(`📊 テーブルは正常に認識されています`);
      
      // sheet_sync_statusカラムが存在するか確認
      console.log('\n2️⃣ sheet_sync_statusカラムの存在確認...');
      const { data: columnCheck, error: columnError } = await supabase
        .from('property_inquiries')
        .select('sheet_sync_status')
        .limit(1);

      if (columnError) {
        console.error('❌ sheet_sync_statusカラムへのアクセスエラー:', columnError);
        console.log('💡 マイグレーション086を実行する必要があります:');
        console.log('   npm run migration:run 086');
      } else {
        console.log('✅ sheet_sync_statusカラムも正常に認識されています');
        console.log('\n🎉 すべて正常です！バックエンドを再起動してください。');
      }
    }
  } catch (error) {
    console.error('❌ 予期しないエラーが発生しました:', error);
  }
}

reloadSchemaCache();
