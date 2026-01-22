// distribution_areas修正の検証テスト
import dotenv from 'dotenv';
import { PropertyListingService } from '../services/PropertyListingService';
import { PropertyDetailsService } from '../services/PropertyDetailsService';
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';
import { AthomeDataService } from '../services/AthomeDataService';

dotenv.config();

async function testDistributionAreasFix() {
  console.log('🧪 Testing distribution_areas fix...\n');
  
  const propertyListingService = new PropertyListingService();
  const propertyDetailsService = new PropertyDetailsService();
  const propertyService = new PropertyService();
  const recommendedCommentService = new RecommendedCommentService();
  const favoriteCommentService = new FavoriteCommentService();
  const athomeDataService = new AthomeDataService();
  
  try {
    // テスト1: 物件を1件取得
    console.log('📊 Test 1: Fetching 1 property...');
    const { data: properties } = await propertyListingService.getAll({
      limit: 1,
      offset: 0
    });
    
    if (!properties || properties.length === 0) {
      console.error('❌ No properties found');
      process.exit(1);
    }
    
    const property = properties[0];
    console.log(`✅ Fetched property: ${property.property_number}`);
    
    // テスト2: 各サービスを呼び出し
    console.log('\n📊 Test 2: Calling all services...');
    
    try {
      const propertyAbout = await propertyService.getPropertyAbout(property.property_number);
      console.log(`✅ PropertyService.getPropertyAbout: ${propertyAbout ? 'OK' : 'null'}`);
    } catch (error: any) {
      if (error.message.includes('distribution_areas')) {
        console.error(`❌ PropertyService failed with distribution_areas error: ${error.message}`);
        process.exit(1);
      }
      console.log(`⚠️  PropertyService.getPropertyAbout: ${error.message}`);
    }
    
    try {
      const recommendedComment = await recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type,
        property.id
      );
      console.log(`✅ RecommendedCommentService: ${recommendedComment.comments.length} comments`);
    } catch (error: any) {
      if (error.message.includes('distribution_areas')) {
        console.error(`❌ RecommendedCommentService failed with distribution_areas error: ${error.message}`);
        process.exit(1);
      }
      console.log(`⚠️  RecommendedCommentService: ${error.message}`);
    }
    
    try {
      const favoriteComment = await favoriteCommentService.getFavoriteComment(property.id);
      console.log(`✅ FavoriteCommentService: ${favoriteComment.comment ? 'OK' : 'null'}`);
    } catch (error: any) {
      if (error.message.includes('distribution_areas')) {
        console.error(`❌ FavoriteCommentService failed with distribution_areas error: ${error.message}`);
        process.exit(1);
      }
      console.log(`⚠️  FavoriteCommentService: ${error.message}`);
    }
    
    try {
      const athomeData = await athomeDataService.getAthomeData(
        property.property_number,
        property.property_type,
        property.storage_location
      );
      console.log(`✅ AthomeDataService: ${athomeData.data.length} items`);
    } catch (error: any) {
      if (error.message.includes('distribution_areas')) {
        console.error(`❌ AthomeDataService failed with distribution_areas error: ${error.message}`);
        process.exit(1);
      }
      console.log(`⚠️  AthomeDataService: ${error.message}`);
    }
    
    // テスト3: property_detailsにupsert
    console.log('\n📊 Test 3: Upserting to property_details...');
    
    const success = await propertyDetailsService.upsertPropertyDetails(property.property_number, {
      property_about: 'Test data',
      recommended_comments: [],
      athome_data: [],
      favorite_comment: null
    });
    
    if (success) {
      console.log(`✅ PropertyDetailsService.upsert: OK`);
    } else {
      console.error(`❌ PropertyDetailsService.upsert: Failed`);
      process.exit(1);
    }
    
    console.log('\n\n🎉 All tests passed! distribution_areas fix is working correctly.');
    console.log('✅ You can now run the full script: npx ts-node src/scripts/populatePropertyDetails.ts');
    
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    
    if (error.message.includes('distribution_areas')) {
      console.error('\n🚨 distribution_areas error still exists!');
      console.error('Please check PropertyListingService.ts for any remaining references.');
    }
    
    process.exit(1);
  }
  
  process.exit(0);
}

testDistributionAreasFix();
