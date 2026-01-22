import { config } from 'dotenv';

// 環境変数を読み込む
config({ path: './backend/.env' });

async function fixAA13129StorageLocationRest() {
  console.log('=== AA13129の格納先URLを更新（REST API） ===\n');

  const storageUrl = 'https://drive.google.com/drive/folders/1nbVqT3XejIfpUIUpsG5d2GAL3To3KV7H?usp=sharing';
  const propertyNumber = 'AA13129';

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません');
    return;
  }

  try {
    // 現在の状態を確認
    console.log('📋 現在の状態を確認中...\n');
    const checkResponse = await fetch(
      `${supabaseUrl}/rest/v1/property_listings?property_number=eq.${propertyNumber}&select=property_number,storage_location`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!checkResponse.ok) {
      console.log('❌ データ取得エラー:', checkResponse.statusText);
      return;
    }

    const currentData = await checkResponse.json() as any[];

    if (!currentData || currentData.length === 0) {
      console.log('❌ AA13129がproperty_listingsテーブルに見つかりません');
      return;
    }

    console.log('現在のstorage_location:', currentData[0].storage_location || '(NULL)');
    console.log('');

    // storage_locationを更新
    console.log('🔄 storage_locationを更新中...\n');
    const updateResponse = await fetch(
      `${supabaseUrl}/rest/v1/property_listings?property_number=eq.${propertyNumber}`,
      {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          storage_location: storageUrl
        })
      }
    );

    if (!updateResponse.ok) {
      console.log('❌ 更新エラー:', updateResponse.statusText);
      const errorText = await updateResponse.text();
      console.log('エラー詳細:', errorText);
      return;
    }

    const updatedData = await updateResponse.json() as any[];

    if (updatedData && updatedData.length > 0) {
      console.log('✅ 更新成功！\n');
      console.log('更新後のデータ:');
      console.log(`  物件番号: ${updatedData[0].property_number}`);
      console.log(`  格納先URL: ${updatedData[0].storage_location}`);
      console.log('');
      console.log('💡 次のステップ:');
      console.log('  1. フロントエンドでAA13129の物件詳細ページを開く');
      console.log('  2. 画像が正しく表示されることを確認');
      console.log('  3. 他の物件でも同様の問題がないか確認');
      console.log('');
      console.log('📊 システム的な問題の可能性:');
      console.log('  - 他の物件でもstorage_locationがNULLになっている可能性');
      console.log('  - 物件同期時にstorage_locationが正しく設定されていない可能性');
      console.log('  - 確認スクリプト: npx ts-node backend/check-storage-url-coverage.ts');
    } else {
      console.log('❌ 更新に失敗しました');
    }

  } catch (error: any) {
    console.log('❌ エラー:', error.message);
    console.error(error);
  }

  console.log('\n=== 修正完了 ===');
}

fixAA13129StorageLocationRest().catch(console.error);
