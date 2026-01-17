// スキーマのカラムを確認
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkSchemaColumns() {
  console.log('=== スキーマのカラムを確認 ===\n');

  // sellersテーブルのカラムを確認
  console.log('📊 sellersテーブル:');
  const { data: sellers, error: sellersError } = await supabase
    .from('sellers')
    .select('*')
    .limit(1);

  if (sellersError) {
    console.log(`  ❌ エラー: ${sellersError.message}`);
  } else if (sellers && sellers.length > 0) {
    const columns = Object.keys(sellers[0]);
    console.log(`  ✅ ${columns.length} カラム:`);
    columns.forEach(col => console.log(`    - ${col}`));
    
    // storage関連のカラムを探す
    const storageColumns = columns.filter(col => col.toLowerCase().includes('storage'));
    if (storageColumns.length > 0) {
      console.log(`\n  📁 storage関連のカラム:`);
      storageColumns.forEach(col => console.log(`    - ${col}`));
    }
  }

  console.log('\n');

  // property_listingsテーブルのカラムを確認
  console.log('📊 property_listingsテーブル:');
  const { data: listings, error: listingsError } = await supabase
    .from('property_listings')
    .select('*')
    .limit(1);

  if (listingsError) {
    console.log(`  ❌ エラー: ${listingsError.message}`);
  } else if (listings && listings.length > 0) {
    const columns = Object.keys(listings[0]);
    console.log(`  ✅ ${columns.length} カラム:`);
    columns.forEach(col => console.log(`    - ${col}`));
    
    // storage関連のカラムを探す
    const storageColumns = columns.filter(col => col.toLowerCase().includes('storage'));
    if (storageColumns.length > 0) {
      console.log(`\n  📁 storage関連のカラム:`);
      storageColumns.forEach(col => console.log(`    - ${col}`));
    }
  }

  // AA13129とAA13154を検索
  console.log('\n\n📊 AA13129とAA13154を検索:\n');
  
  // seller_numberで検索
  for (const sellerNumber of ['AA13129', 'AA13154']) {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('*')
      .eq('seller_number', sellerNumber)
      .single();

    console.log(`🔍 ${sellerNumber}:`);
    if (error) {
      console.log(`  ❌ sellersテーブルに見つかりません: ${error.message}`);
    } else if (seller) {
      console.log(`  ✅ sellersテーブルに存在`);
      // storage関連のフィールドを表示
      Object.keys(seller).forEach(key => {
        if (key.toLowerCase().includes('storage') || key.toLowerCase().includes('url')) {
          console.log(`    ${key}: ${seller[key] || '(NULL)'}`);
        }
      });
    }

    const { data: listing, error: listingError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('seller_number', sellerNumber)
      .single();

    if (listingError) {
      console.log(`  ❌ property_listingsテーブルに見つかりません: ${listingError.message}`);
    } else if (listing) {
      console.log(`  ✅ property_listingsテーブルに存在`);
      // storage関連のフィールドを表示
      Object.keys(listing).forEach(key => {
        if (key.toLowerCase().includes('storage') || key.toLowerCase().includes('url')) {
          console.log(`    ${key}: ${listing[key] || '(NULL)'}`);
        }
      });
    }
    console.log('');
  }
}

checkSchemaColumns().catch(console.error);
