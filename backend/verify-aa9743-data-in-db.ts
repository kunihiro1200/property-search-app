import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAA9743Data() {
  console.log('=== AA9743 データベース確認 ===\n');

  const propertyNumber = 'AA9743';

  try {
    // property_detailsテーブルからデータを取得
    const { data, error } = await supabase
      .from('property_details')
      .select('*')
      .eq('property_number', propertyNumber)
      .single();

    if (error) {
      console.error('❌ エラー:', error);
      return;
    }

    if (!data) {
      console.log('❌ AA9743のデータが見つかりません');
      return;
    }

    console.log('✅ AA9743のデータが見つかりました\n');
    
    console.log('📊 recommended_comments:');
    if (data.recommended_comments && Array.isArray(data.recommended_comments)) {
      console.log(`  行数: ${data.recommended_comments.length}`);
      console.log('  内容:');
      data.recommended_comments.forEach((row: any, index: number) => {
        if (Array.isArray(row)) {
          console.log(`    行${index + 1}: [${row.length}個のセル] ${row.join(' ')}`);
        } else {
          console.log(`    行${index + 1}: ${row}`);
        }
      });
    } else {
      console.log('  ❌ なし');
    }

    console.log('\n📊 athome_data:');
    if (data.athome_data && Array.isArray(data.athome_data)) {
      console.log(`  件数: ${data.athome_data.length}`);
      data.athome_data.forEach((item: any, index: number) => {
        console.log(`    ${index + 1}: ${item}`);
      });
    } else {
      console.log('  ❌ なし');
    }

    console.log('\n📊 favorite_comment:');
    console.log(`  ${data.favorite_comment || '❌ なし'}`);

    console.log('\n📊 property_about:');
    console.log(`  ${data.property_about || '❌ なし'}`);

  } catch (error) {
    console.error('❌ エラー:', error);
  }
}

verifyAA9743Data().catch(console.error);
