// AA13129とAA13154の格納先URL転記問題の簡易診断スクリプト
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込む
config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function diagnoseStorageUrlSimple() {
  console.log('=== AA13129 vs AA13154 格納先URL転記問題の簡易診断 ===\n');

  const propertyNumbers = ['AA13129', 'AA13154'];

  // 1. sellersテーブルから両物件のデータを取得
  console.log('📊 ステップ1: sellersテーブルからデータを取得\n');

  for (const propertyNumber of propertyNumbers) {
    const { data: seller, error } = await supabase
      .from('sellers')
      .select('property_number, storage_url, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    console.log(`🔍 ${propertyNumber} - sellersテーブル:`);
    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (seller) {
      console.log(`  ✅ 物件番号: ${seller.property_number}`);
      console.log(`  📁 storage_url: ${seller.storage_url || '(NULL)'}`);
      console.log(`  📁 storage_location: ${seller.storage_location || '(NULL)'}`);
    } else {
      console.log(`  ❌ データが見つかりません`);
    }
    console.log('');
  }

  // 2. property_listingsテーブルから両物件のデータを取得
  console.log('\n📊 ステップ2: property_listingsテーブルからデータを取得\n');

  for (const propertyNumber of propertyNumbers) {
    const { data: listing, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_url, storage_location')
      .eq('property_number', propertyNumber)
      .single();

    console.log(`🔍 ${propertyNumber} - property_listingsテーブル:`);
    if (error) {
      console.log(`  ❌ エラー: ${error.message}`);
    } else if (listing) {
      console.log(`  ✅ 物件番号: ${listing.property_number}`);
      console.log(`  📁 storage_url: ${listing.storage_url || '(NULL)'}`);
      console.log(`  📁 storage_location: ${listing.storage_location || '(NULL)'}`);
    } else {
      console.log(`  ❌ データが見つかりません`);
    }
    console.log('');
  }

  // 3. カラムマッピングの確認
  console.log('\n📊 ステップ3: カラムマッピングの確認\n');
  console.log('📋 property-listing-column-mapping.json:');
  console.log('  - スプレッドシート「保存場所」→ データベース「storage_location」');
  console.log('\n📋 PropertyListingSyncService.ts:');
  console.log('  - seller.storage_url → property_listings.storage_url');
  console.log('\n⚠️  不一致の可能性:');
  console.log('  - スプレッドシート同期: 「保存場所」→「storage_location」');
  console.log('  - PropertyListingSyncService: 「storage_url」を使用');

  // 4. 診断結果
  console.log('\n\n📊 ステップ4: 診断結果\n');
  
  const { data: aa13129Seller } = await supabase
    .from('sellers')
    .select('storage_url, storage_location')
    .eq('property_number', 'AA13129')
    .single();

  const { data: aa13154Seller } = await supabase
    .from('sellers')
    .select('storage_url, storage_location')
    .eq('property_number', 'AA13154')
    .single();

  console.log('🔍 根本原因の分析:');
  
  if (aa13129Seller?.storage_url && !aa13154Seller?.storage_url) {
    console.log('\n✅ 原因を特定しました:');
    console.log('  - AA13129: storage_url に値がある');
    console.log('  - AA13154: storage_url が NULL');
    
    if (aa13154Seller?.storage_location) {
      console.log('  - AA13154: storage_location に値がある');
      console.log('\n💡 解決策:');
      console.log('  1. PropertyListingSyncService.ts を修正');
      console.log('     storage_url の代わりに storage_location を使用');
      console.log('  または');
      console.log('  2. sellersテーブルで storage_location → storage_url にコピー');
    } else {
      console.log('  - AA13154: storage_location も NULL');
      console.log('\n💡 解決策:');
      console.log('  1. スプレッドシートの「保存場所」を確認');
      console.log('  2. 値があれば再同期を実行');
      console.log('  3. 値がなければスプレッドシートに追加');
    }
  } else {
    console.log('\n⚠️  予想外のパターンです。詳細を確認してください。');
  }

  console.log('\n\n📝 次のステップ:');
  console.log('  1. スプレッドシートの「保存場所」カラムを確認');
  console.log('  2. storage_url と storage_location の使い分けを決定');
  console.log('  3. 必要に応じてコードまたはデータを修正');
}

diagnoseStorageUrlSimple().catch(console.error);
