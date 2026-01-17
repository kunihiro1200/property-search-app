import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSellersSchema() {
  console.log('🔍 sellersテーブルのスキーマを確認します...\n');

  try {
    // 1. sellersテーブルの1件を取得してカラムを確認
    console.log('1️⃣ sellersテーブルの最初の1件を取得:');
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ エラー:', error);
    } else if (seller) {
      console.log('✅ 取得成功');
      console.log('\n📋 利用可能なカラム:');
      const columns = Object.keys(seller).sort();
      columns.forEach((col, index) => {
        console.log(`  ${index + 1}. ${col}`);
      });
      
      console.log('\n🔍 削除関連のカラムを確認:');
      const deletionColumns = columns.filter(col => 
        col.includes('delete') || col.includes('removed') || col.includes('archived')
      );
      if (deletionColumns.length > 0) {
        console.log('  見つかった削除関連カラム:', deletionColumns.join(', '));
      } else {
        console.log('  ❌ 削除関連のカラムが見つかりません');
      }
    }

    // 2. 総数を確認（deleted_atなしで）
    console.log('\n2️⃣ 売主の総数を確認:');
    const { count, error: countError } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ エラー:', countError);
    } else {
      console.log(`✅ 総売主数: ${count}件`);
    }

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
  }
}

checkSellersSchema();
