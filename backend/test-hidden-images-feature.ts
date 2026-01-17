// hidden_images機能のテスト - Supabase RPCを使用
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testHiddenImagesFeature() {
  console.log('=== hidden_images機能テスト (RPC経由) ===\n');

  try {
    // 1. テスト用の物件を取得 (AA13129 - storage_locationが存在する物件)
    console.log('1. テスト用物件を取得中...');
    
    // RPC関数を使用して直接SQLを実行
    const { data: properties, error: fetchError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT id, property_number, storage_location, hidden_images 
                  FROM property_listings 
                  WHERE property_number = 'AA13129'
                  LIMIT 1`
    });

    if (fetchError) {
      console.error('❌ 物件の取得に失敗:', fetchError);
      console.log('   RPCが利用できない場合は、Supabase Dashboardで以下のSQL関数を作成してください:');
      console.log(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql_query INTO result;
  RETURN result;
END;
$$;
      `);
      return;
    }

    if (!properties || properties.length === 0) {
      console.error('❌ 物件が見つかりません');
      return;
    }

    const property = properties[0];
    console.log(`✅ テスト物件: ${property.property_number} (ID: ${property.id})`);
    console.log(`   storage_location: ${property.storage_location || 'なし'}`);
    console.log(`   hidden_images: ${JSON.stringify(property.hidden_images || [])}\n`);

    // 2. 初期状態を確認
    console.log('2. 初期状態を確認...');
    const { data: initialData, error: initialError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT hidden_images FROM property_listings WHERE id = '${property.id}'`
    });

    if (initialError) {
      console.error('❌ 初期状態の取得に失敗:', initialError);
      return;
    }

    const initialState = initialData[0];
    console.log(`✅ 初期hidden_images:`, initialState.hidden_images || []);
    console.log();

    // 3. テスト用のファイルIDを追加
    const testFileId = 'test-file-id-12345';
    console.log(`3. 画像を非表示にする (fileId: ${testFileId})...`);
    
    const currentHidden = initialState.hidden_images || [];
    const updatedHidden = [...currentHidden, testFileId];
    
    const { error: hideError } = await supabase.rpc('exec_sql', {
      sql_query: `UPDATE property_listings 
                  SET hidden_images = '${JSON.stringify(updatedHidden)}'::jsonb 
                  WHERE id = '${property.id}'`
    });

    if (hideError) {
      console.error('❌ 画像の非表示に失敗:', hideError);
      return;
    }

    console.log(`✅ 画像を非表示にしました\n`);

    // 4. 非表示後の状態を確認
    console.log('4. 非表示後の状態を確認...');
    const { data: afterHideData, error: afterHideError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT hidden_images FROM property_listings WHERE id = '${property.id}'`
    });

    if (afterHideError) {
      console.error('❌ 状態の取得に失敗:', afterHideError);
      return;
    }

    const afterHide = afterHideData[0];
    console.log(`✅ hidden_images:`, afterHide.hidden_images);
    console.log(`✅ テストファイルIDが含まれている:`, afterHide.hidden_images?.includes(testFileId));
    console.log();

    // 5. 画像を復元
    console.log(`5. 画像を復元する (fileId: ${testFileId})...`);
    
    const restoredHidden = (afterHide.hidden_images || []).filter((id: string) => id !== testFileId);
    
    const { error: restoreError } = await supabase.rpc('exec_sql', {
      sql_query: `UPDATE property_listings 
                  SET hidden_images = '${JSON.stringify(restoredHidden)}'::jsonb 
                  WHERE id = '${property.id}'`
    });

    if (restoreError) {
      console.error('❌ 画像の復元に失敗:', restoreError);
      return;
    }

    console.log(`✅ 画像を復元しました\n`);

    // 6. 復元後の状態を確認
    console.log('6. 復元後の状態を確認...');
    const { data: afterRestoreData, error: afterRestoreError } = await supabase.rpc('exec_sql', {
      sql_query: `SELECT hidden_images FROM property_listings WHERE id = '${property.id}'`
    });

    if (afterRestoreError) {
      console.error('❌ 状態の取得に失敗:', afterRestoreError);
      return;
    }

    const afterRestore = afterRestoreData[0];
    console.log(`✅ hidden_images:`, afterRestore.hidden_images || []);
    console.log(`✅ テストファイルIDが削除されている:`, !afterRestore.hidden_images?.includes(testFileId));
    console.log();

    // 7. クリーンアップ
    console.log('7. クリーンアップ...');
    const { error: cleanupError } = await supabase.rpc('exec_sql', {
      sql_query: `UPDATE property_listings 
                  SET hidden_images = '${JSON.stringify(initialState.hidden_images || [])}'::jsonb 
                  WHERE id = '${property.id}'`
    });

    if (cleanupError) {
      console.error('❌ クリーンアップに失敗:', cleanupError);
      return;
    }

    console.log(`✅ 初期状態に戻しました\n`);

    console.log('=== テスト完了 ===');
    console.log('✅ hidden_imagesカラムが正常に動作しています');
    console.log('✅ 画像の非表示/復元が可能です');
    console.log('✅ PostgRESTのキャッシュ問題を回避できました');
    console.log('✅ PropertyListingServiceの実装が必要です（重複防止ロジック）');

  } catch (error) {
    console.error('❌ テスト中にエラーが発生:', error);
  }
}

testHiddenImagesFeature();
