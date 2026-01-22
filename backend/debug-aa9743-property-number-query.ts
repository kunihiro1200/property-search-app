import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

async function debugPropertyNumberQuery() {
  console.log('=== AA9743 物件番号クエリのデバッグ ===\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const propertyNumber = 'AA9743';
  
  console.log(`物件番号: ${propertyNumber}\n`);
  
  // 1. 完全一致検索（.single()なし）
  console.log('1️⃣ 完全一致検索（複数件対応）...');
  try {
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', propertyNumber);
    
    if (error) {
      console.error('  ❌ エラー:', error);
    } else {
      console.log(`  ✅ 見つかった件数: ${properties?.length || 0}`);
      if (properties && properties.length > 0) {
        properties.forEach((p, i) => {
          console.log(`  ${i + 1}. ID: ${p.id}`);
          console.log(`     物件番号: ${p.property_number}`);
          console.log(`     storage_location: ${p.storage_location || 'なし'}`);
        });
      }
    }
  } catch (err: any) {
    console.error('  ❌ 例外:', err.message);
  }
  
  // 2. .single()を使った検索
  console.log('\n2️⃣ .single()を使った検索...');
  try {
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      console.error('  ❌ エラー:', error);
      console.error('  エラーコード:', error.code);
      console.error('  エラーメッセージ:', error.message);
    } else {
      console.log(`  ✅ 物件が見つかりました`);
      console.log(`  ID: ${property.id}`);
      console.log(`  物件番号: ${property.property_number}`);
      console.log(`  storage_location: ${property.storage_location || 'なし'}`);
    }
  } catch (err: any) {
    console.error('  ❌ 例外:', err.message);
  }
  
  // 3. 大文字小文字を区別しない検索
  console.log('\n3️⃣ 大文字小文字を区別しない検索...');
  try {
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .ilike('property_number', propertyNumber);
    
    if (error) {
      console.error('  ❌ エラー:', error);
    } else {
      console.log(`  ✅ 見つかった件数: ${properties?.length || 0}`);
      if (properties && properties.length > 0) {
        properties.forEach((p, i) => {
          console.log(`  ${i + 1}. ID: ${p.id}`);
          console.log(`     物件番号: ${p.property_number}`);
          console.log(`     storage_location: ${p.storage_location || 'なし'}`);
        });
      }
    }
  } catch (err: any) {
    console.error('  ❌ 例外:', err.message);
  }
}

debugPropertyNumberQuery();
