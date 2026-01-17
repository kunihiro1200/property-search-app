import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyHiddenImagesColumn() {
  console.log('=== hidden_imagesカラムの確認 ===\n');

  try {
    // 1. テーブル構造を確認
    console.log('1. テーブル構造の確認...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'property_listings')
      .eq('table_schema', 'public');

    if (columnsError) {
      console.error('カラム情報の取得エラー:', columnsError);
    } else {
      console.log('property_listingsテーブルのカラム:');
      columns?.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default})`);
      });
      
      const hasHiddenImages = columns?.some(col => col.column_name === 'hidden_images');
      console.log(`\nhidden_imagesカラムの存在: ${hasHiddenImages ? '✓ あり' : '✗ なし'}`);
    }

    // 2. 直接SQLでカラムを確認
    console.log('\n2. 直接SQLでカラムを確認...');
    const { data: sqlResult, error: sqlError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'property_listings'
        AND column_name = 'hidden_images';
      `
    });

    if (sqlError) {
      console.log('RPC関数が利用できません。代替方法を試します...');
    } else {
      console.log('SQL結果:', sqlResult);
    }

    // 3. 実際のデータを取得してカラムの存在を確認
    console.log('\n3. 実際のデータでカラムの存在を確認...');
    const { data: testData, error: testError } = await supabase
      .from('property_listings')
      .select('id, hidden_images')
      .limit(1);

    if (testError) {
      console.error('✗ hidden_imagesカラムへのアクセスエラー:', testError.message);
      console.error('詳細:', testError);
    } else {
      console.log('✓ hidden_imagesカラムへのアクセス成功');
      console.log('サンプルデータ:', testData);
    }

    // 4. PostgRESTのスキーマキャッシュ状態を確認
    console.log('\n4. PostgRESTスキーマキャッシュの確認...');
    const { error: cacheError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(0);

    if (cacheError) {
      console.error('スキーマキャッシュ確認エラー:', cacheError);
    } else {
      console.log('✓ スキーマキャッシュは正常に動作しています');
    }

    // 5. マイグレーション履歴を確認
    console.log('\n5. マイグレーション履歴の確認...');
    const { data: migrations, error: migrationsError } = await supabase
      .from('schema_migrations')
      .select('*')
      .order('version', { ascending: false })
      .limit(5);

    if (migrationsError) {
      console.log('マイグレーション履歴テーブルが見つかりません');
    } else {
      console.log('最新のマイグレーション:');
      migrations?.forEach(m => {
        console.log(`  - ${m.version}: ${m.name || 'N/A'}`);
      });
    }

  } catch (error) {
    console.error('予期しないエラー:', error);
  }
}

verifyHiddenImagesColumn().then(() => {
  console.log('\n=== 確認完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('実行エラー:', error);
  process.exit(1);
});
