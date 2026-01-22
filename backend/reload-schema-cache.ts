import dotenv from 'dotenv';

dotenv.config();

async function reloadSchemaCache() {
  console.log('\n=== PostgRESTスキーマキャッシュのリロード ===\n');

  try {
    const supabaseUrl = process.env.SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // PostgREST APIのエンドポイント
    const postgrestUrl = supabaseUrl.replace('https://', 'https://').replace('.supabase.co', '.supabase.co');
    
    console.log('PostgRESTスキーマキャッシュをリロードしています...');
    console.log(`URL: ${postgrestUrl}`);

    // PostgRESTのスキーマキャッシュをリロード
    const response = await fetch(`${postgrestUrl}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      }
    });

    if (response.ok || response.status === 404) {
      console.log('✅ スキーマキャッシュのリロードをリクエストしました');
      console.log('\n注意: スキーマキャッシュの更新には数秒かかる場合があります');
      console.log('      5-10秒待ってから診断ツールを再実行してください');
    } else {
      console.log('⚠️  リクエストは送信されましたが、レスポンスが予期しないものでした');
      console.log(`   ステータス: ${response.status}`);
    }

    console.log('\n=== 代替方法 ===\n');
    console.log('スキーマキャッシュのリロードが機能しない場合、以下の方法を試してください：');
    console.log('\n【方法1】Supabaseプロジェクトの一時停止・再開');
    console.log('1. https://supabase.com/dashboard を開く');
    console.log('2. プロジェクトを選択');
    console.log('3. Settings → General');
    console.log('4. "Pause project" をクリック');
    console.log('5. 数秒待つ');
    console.log('6. "Resume project" をクリック');
    
    console.log('\n【方法2】PostgreSQL直接接続でRELOADを実行');
    console.log('Supabase SQL Editorで以下を実行:');
    console.log('```sql');
    console.log('NOTIFY pgrst, \'reload schema\';');
    console.log('```');

    console.log('\n=== 次のステップ ===\n');
    console.log('1. 5-10秒待つ');
    console.log('2. 診断ツールを再実行:');
    console.log('   npx ts-node diagnose-auto-sync-status.ts');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    console.log('\n手動でSupabaseプロジェクトを一時停止・再開してください');
  }
}

reloadSchemaCache();
