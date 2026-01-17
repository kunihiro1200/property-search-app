// データベースでAA4885を確認
import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// 環境変数を読み込み
config();

async function checkAA4885InDatabase() {
  console.log('🔍 データベースでAA4885を確認中...\n');
  console.log('='.repeat(80));
  
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    // property_listingsテーブルを確認
    console.log('📊 Step 1: property_listingsテーブルを確認');
    console.log('-'.repeat(80));
    
    const { data: propertyListing, error: plError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (plError && plError.code !== 'PGRST116') {
      console.error('❌ エラー:', plError.message);
    } else if (!propertyListing) {
      console.log('❌ AA4885がproperty_listingsテーブルに見つかりません');
    } else {
      console.log('✅ AA4885がproperty_listingsテーブルに存在します\n');
      console.log('📋 重要なフィールド:');
      console.log(`  物件番号: ${propertyListing.property_number}`);
      console.log(`  ATBB状況: ${propertyListing.atbb_status || '(空)'}`);
      console.log(`  ATBB公開フォルダ: ${propertyListing.atbb_public_folder || '(空)'}`);
      console.log(`  athome状況: ${propertyListing.athome_status || '(空)'}`);
      console.log(`  athome公開フォルダ: ${propertyListing.athome_public_folder || '(空)'}`);
      console.log(`  更新日時: ${propertyListing.updated_at}`);
    }
    
    // sellersテーブルを確認
    console.log('\n📊 Step 2: sellersテーブルを確認');
    console.log('-'.repeat(80));
    
    const { data: seller, error: sellerError } = await supabase
      .from('sellers')
      .select('*')
      .eq('property_number', 'AA4885')
      .single();
    
    if (sellerError && sellerError.code !== 'PGRST116') {
      console.error('❌ エラー:', sellerError.message);
    } else if (!seller) {
      console.log('❌ AA4885がsellersテーブルに見つかりません');
    } else {
      console.log('✅ AA4885がsellersテーブルに存在します\n');
      console.log('📋 重要なフィールド:');
      console.log(`  物件番号: ${seller.property_number}`);
      console.log(`  ATBB状況: ${seller.atbb_status || '(空)'}`);
      console.log(`  ATBB公開フォルダ: ${seller.atbb_public_folder || '(空)'}`);
      console.log(`  athome状況: ${seller.athome_status || '(空)'}`);
      console.log(`  athome公開フォルダ: ${seller.athome_public_folder || '(空)'}`);
      console.log(`  更新日時: ${seller.updated_at}`);
    }
    
    // 結論
    console.log('\n📊 結論:');
    console.log('='.repeat(80));
    
    if (!propertyListing && !seller) {
      console.log('❌ AA4885はデータベースに存在しません');
      console.log('💡 スプレッドシートにも存在しないため、削除された可能性があります');
    } else if (propertyListing || seller) {
      console.log('⚠️  AA4885はデータベースに存在しますが、スプレッドシートには存在しません');
      console.log('💡 これは以下のいずれかを意味します:');
      console.log('   1. スプレッドシートから削除された');
      console.log('   2. 物件番号が変更された');
      console.log('   3. スプレッドシートの別のシートに移動された');
    }
    
  } catch (error: any) {
    console.error('❌ エラー:', error.message);
    if (error.stack) {
      console.error('\nスタックトレース:');
      console.error(error.stack);
    }
  }
}

// 実行
checkAA4885InDatabase()
  .then(() => {
    console.log('\n✅ スクリプト完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ スクリプトエラー:', error);
    process.exit(1);
  });
