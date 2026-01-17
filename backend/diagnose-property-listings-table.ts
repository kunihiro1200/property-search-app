import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnosePropertyListingsTable() {
  console.log('🔍 property_listingsテーブルの診断を開始...\n');

  try {
    // 1. テーブルの存在確認
    console.log('1️⃣ テーブルの存在確認...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings');

    if (tablesError) {
      console.error('❌ テーブル確認エラー:', tablesError);
    } else if (!tables || tables.length === 0) {
      console.error('❌ property_listingsテーブルが存在しません！');
      return;
    } else {
      console.log('✅ property_listingsテーブルは存在します');
    }

    // 2. カラム一覧の取得
    console.log('\n2️⃣ カラム一覧の取得...');
    const { data: columns, error: columnsError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', 'property_listings')
      .order('ordinal_position');

    if (columnsError) {
      console.error('❌ カラム取得エラー:', columnsError);
    } else {
      console.log(`✅ ${columns?.length || 0}個のカラムが見つかりました：`);
      columns?.forEach((col: any) => {
        const marker = col.column_name === 'hidden_images' ? '🎯' : '  ';
        console.log(`${marker} - ${col.column_name} (${col.data_type})`);
      });

      const hasHiddenImages = columns?.some((col: any) => col.column_name === 'hidden_images');
      if (hasHiddenImages) {
        console.log('\n✅ hidden_imagesカラムは存在します！');
      } else {
        console.log('\n❌ hidden_imagesカラムが存在しません！');
      }
    }

    // 3. データ件数の確認
    console.log('\n3️⃣ データ件数の確認...');
    const { count, error: countError } = await supabase
      .from('property_listings')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ データ件数取得エラー:', countError);
    } else {
      console.log(`✅ ${count}件のデータが存在します`);
    }

    // 4. 実際のデータを1件取得してみる
    console.log('\n4️⃣ サンプルデータの取得...');
    const { data: sample, error: sampleError } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1)
      .single();

    if (sampleError) {
      console.error('❌ サンプルデータ取得エラー:', sampleError);
    } else {
      console.log('✅ サンプルデータ取得成功');
      console.log('カラム:', Object.keys(sample || {}));
      const hasHiddenImagesInData = sample && 'hidden_images' in sample;
      if (hasHiddenImagesInData) {
        console.log('✅ データにhidden_imagesフィールドが含まれています');
      } else {
        console.log('❌ データにhidden_imagesフィールドが含まれていません');
      }
    }

    // 5. 接続先の確認
    console.log('\n5️⃣ 接続先の確認...');
    console.log('SUPABASE_URL:', supabaseUrl);
    console.log('プロジェクトID:', supabaseUrl.split('//')[1]?.split('.')[0]);

  } catch (error) {
    console.error('❌ 診断中にエラーが発生:', error);
  }
}

diagnosePropertyListingsTable();
