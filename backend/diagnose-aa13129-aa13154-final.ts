// AA13129とAA13154の格納先URL転記問題の最終診断スクリプト
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseFinal() {
  console.log('=== AA13129 vs AA13154 格納先URL転記問題の診断 ===\n');

  const sellerNumbers = ['AA13129', 'AA13154'];

  // 1. sellersテーブルから両物件のデータを取得
  console.log('📊 ステップ1: sellersテーブルからデータを取得\n');

  const sellersData: any = {};

  for (const sellerNumber of sellerNumbers) {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('seller_number, site_url, site')
      .eq('seller_number', sellerNumber)
      .single();

    console.log(`🔍 ${sellerNumber} - sellersテーブル:`);
    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (seller) {
      sellersData[sellerNumber] = seller;
      console.log(`  ✅ 売主番号: ${seller.seller_number}`);
      console.log(`  📁 site_url: ${seller.site_url || '(NULL)'}`);
      console.log(`  📁 site: ${seller.site || '(NULL)'}`);
    } else {
      console.log(`  ❌ データが見つかりません`);
    }
    console.log('');
  }

  // 2. property_listingsテーブルから両物件のデータを取得
  console.log('\n📊 ステップ2: property_listingsテーブルからデータを取得\n');

  const listingsData: any = {};

  for (const propertyNumber of sellerNumbers) {
    const { data: listing, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location, google_map_url')
      .eq('property_number', propertyNumber)
      .single();

    console.log(`🔍 ${propertyNumber} - property_listingsテーブル:`);
    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (listing) {
      listingsData[propertyNumber] = listing;
      console.log(`  ✅ 物件番号: ${listing.property_number}`);
      console.log(`  📁 storage_location: ${listing.storage_location || '(NULL)'}`);
      console.log(`  📁 google_map_url: ${listing.google_map_url || '(NULL)'}`);
    } else {
      console.log(`  ❌ データが見つかりません`);
    }
    console.log('');
  }

  // 3. カラムマッピングの確認
  console.log('\n📊 ステップ3: カラムマッピングの確認\n');
  console.log('📋 実際のスキーマ:');
  console.log('  sellersテーブル:');
  console.log('    - site_url (text)');
  console.log('    - site (text)');
  console.log('  property_listingsテーブル:');
  console.log('    - storage_location (text)');
  console.log('    - google_map_url (text)');
  console.log('\n📋 property-listing-column-mapping.json:');
  console.log('  - スプレッドシート「保存場所」→ property_listings.storage_location');
  console.log('\n📋 PropertyListingSyncService.ts:');
  console.log('  - seller.storage_url → property_listings.storage_url');
  console.log('  ⚠️  しかし、storage_urlカラムは存在しません！');

  // 4. 診断結果
  console.log('\n\n📊 ステップ4: 診断結果と根本原因\n');
  
  console.log('🔍 データの比較:');
  console.log('\nAA13129:');
  if (sellersData['AA13129']) {
    console.log(`  sellers.site_url: ${sellersData['AA13129'].site_url || '(NULL)'}`);
    console.log(`  sellers.site: ${sellersData['AA13129'].site || '(NULL)'}`);
  }
  if (listingsData['AA13129']) {
    console.log(`  property_listings.storage_location: ${listingsData['AA13129'].storage_location || '(NULL)'}`);
  }

  console.log('\nAA13154:');
  if (sellersData['AA13154']) {
    console.log(`  sellers.site_url: ${sellersData['AA13154'].site_url || '(NULL)'}`);
    console.log(`  sellers.site: ${sellersData['AA13154'].site || '(NULL)'}`);
  }
  if (listingsData['AA13154']) {
    console.log(`  property_listings.storage_location: ${listingsData['AA13154'].storage_location || '(NULL)'}`);
  }

  console.log('\n\n⚠️  根本原因を特定しました:\n');
  console.log('1. PropertyListingSyncService.tsは存在しないカラムを参照している');
  console.log('   - コード: storage_url: seller.storage_url');
  console.log('   - 実際: sellersテーブルにstorage_urlカラムは存在しない');
  console.log('');
  console.log('2. 正しいカラム名:');
  console.log('   - sellers.site_url (URLを保存)');
  console.log('   - property_listings.storage_location (保存場所を保存)');
  console.log('');
  console.log('3. カラムマッピングの不一致:');
  console.log('   - スプレッドシート「保存場所」→ storage_location');
  console.log('   - PropertyListingSyncServiceは存在しないstorage_urlを参照');

  console.log('\n\n💡 解決策:\n');
  console.log('オプション1: PropertyListingSyncService.tsを修正');
  console.log('  - storage_url: seller.storage_url');
  console.log('  ↓');
  console.log('  - storage_location: seller.site_url');
  console.log('  または');
  console.log('  - storage_location: seller.site');
  console.log('');
  console.log('オプション2: スキーマを確認');
  console.log('  - sellersテーブルのどのカラムに保存場所URLが入っているか確認');
  console.log('  - site_url と site の使い分けを明確化');
  console.log('');
  console.log('オプション3: マイグレーションを実行');
  console.log('  - storage_urlカラムを追加');
  console.log('  - site_urlまたはsiteからデータをコピー');

  console.log('\n\n📝 次のステップ:\n');
  console.log('1. スプレッドシートの「保存場所」カラムを確認');
  console.log('2. sellersテーブルのsite_urlとsiteの値を確認');
  console.log('3. PropertyListingSyncService.tsのマッピングを修正');
  console.log('4. AA13154を再同期してテスト');
}

diagnoseFinal().catch(console.error);
