// お気に入り文言の同期結果を検証するスクリプト
import dotenv from 'dotenv';
import { PropertyListingService } from './src/services/PropertyListingService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

// 公開中物件のATBB状態リスト
const PUBLIC_ATBB_STATUSES = [
  '一般・公開中',
  '専任・公開中',
  '非公開（配信メールのみ）'
];

async function verifySync() {
  console.log('🔍 Verifying favorite comment sync...\n');
  
  const propertyListingService = new PropertyListingService();
  const propertyDetailsService = new PropertyDetailsService();
  
  try {
    // 公開中物件を取得
    console.log('📦 Fetching public properties...');
    const { data: properties, total } = await propertyListingService.getAll({
      limit: 1000,
      offset: 0,
      orderBy: 'created_at',
      orderDirection: 'desc'
    });
    
    // 公開中物件のみフィルタリング
    const publicProperties = properties.filter(p => 
      p.atbb_status && PUBLIC_ATBB_STATUSES.includes(p.atbb_status)
    );
    
    console.log(`📊 Found ${publicProperties.length} public properties\n`);
    
    // 統計情報
    let withFavoriteComment = 0;
    let withoutFavoriteComment = 0;
    const samples: any[] = [];
    
    // 各物件をチェック
    for (const property of publicProperties) {
      const details = await propertyDetailsService.getPropertyDetails(property.property_number);
      
      if (details.favorite_comment) {
        withFavoriteComment++;
        
        // 最初の5件をサンプルとして保存
        if (samples.length < 5) {
          samples.push({
            property_number: property.property_number,
            property_type: property.property_type,
            atbb_status: property.atbb_status,
            favorite_comment: details.favorite_comment.substring(0, 100) + (details.favorite_comment.length > 100 ? '...' : '')
          });
        }
      } else {
        withoutFavoriteComment++;
      }
    }
    
    // 結果表示
    console.log('='.repeat(60));
    console.log('📊 VERIFICATION REPORT');
    console.log('='.repeat(60));
    console.log(`Total Public Properties: ${publicProperties.length}`);
    console.log(`✅ With Favorite Comment: ${withFavoriteComment} (${Math.round(withFavoriteComment / publicProperties.length * 100)}%)`);
    console.log(`❌ Without Favorite Comment: ${withoutFavoriteComment} (${Math.round(withoutFavoriteComment / publicProperties.length * 100)}%)`);
    console.log('='.repeat(60));
    
    // サンプル表示
    if (samples.length > 0) {
      console.log('\n📝 Sample Properties with Favorite Comment:');
      samples.forEach((sample, index) => {
        console.log(`\n${index + 1}. ${sample.property_number} (${sample.property_type})`);
        console.log(`   Status: ${sample.atbb_status}`);
        console.log(`   Comment: "${sample.favorite_comment}"`);
      });
    }
    
    console.log('\n✅ Verification complete!');
    
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// スクリプト実行
verifySync();
