import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';
import { AthomeDataService } from '../services/AthomeDataService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testRealPublicProperty() {
  try {
    console.log('🔍 Testing with a real 専任・公開中 or 一般・公開中 property...\n');
    
    // 専任・公開中 または 一般・公開中 の物件を取得
    const { data: properties, error } = await supabase
      .from('property_listings')
      .select('*')
      .or('atbb_status.eq.専任・公開中,atbb_status.eq.一般・公開中')
      .limit(1);
    
    if (error || !properties || properties.length === 0) {
      console.error('❌ Error fetching property:', error);
      return;
    }
    
    const property = properties[0];
    
    console.log('📋 Testing with property:');
    console.log(`   Property Number: ${property.property_number}`);
    console.log(`   Property Type: ${property.property_type}`);
    console.log(`   ATBB Status: ${property.atbb_status}`);
    console.log(`   Storage Location: ${property.storage_location || 'NULL'}`);
    console.log('');
    
    const propertyService = new PropertyService();
    const recommendedCommentService = new RecommendedCommentService();
    const favoriteCommentService = new FavoriteCommentService();
    const athomeDataService = new AthomeDataService();
    
    // 1. Property About
    console.log('1️⃣ Testing PropertyService.getPropertyAbout()...');
    try {
      const propertyAbout = await propertyService.getPropertyAbout(property.property_number);
      if (propertyAbout) {
        console.log(`   ✅ Success: ${propertyAbout.substring(0, 100)}...`);
      } else {
        console.log('   ⚠️ No data returned (null)');
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    console.log('');
    
    // 2. Recommended Comments
    console.log('2️⃣ Testing RecommendedCommentService.getRecommendedComment()...');
    try {
      const result = await recommendedCommentService.getRecommendedComment(
        property.property_number,
        property.property_type,
        property.id
      );
      console.log(`   📊 Result:`, JSON.stringify(result, null, 2));
      if (result.comments && result.comments.length > 0) {
        console.log(`   ✅ Success: ${result.comments.length} comments found`);
        result.comments.forEach((comment: any, index: number) => {
          console.log(`      ${index + 1}. ${comment.title}: ${comment.content?.substring(0, 50)}...`);
        });
      } else {
        console.log('   ⚠️ No comments returned (empty array)');
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    console.log('');
    
    // 3. Favorite Comment
    console.log('3️⃣ Testing FavoriteCommentService.getFavoriteComment()...');
    try {
      const result = await favoriteCommentService.getFavoriteComment(property.id);
      console.log(`   📊 Result:`, JSON.stringify(result, null, 2));
      if (result.comment) {
        console.log(`   ✅ Success: ${result.comment.substring(0, 100)}...`);
      } else {
        console.log('   ⚠️ No comment returned (null)');
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    console.log('');
    
    // 4. Athome Data (Image URLs)
    console.log('4️⃣ Testing AthomeDataService.getAthomeData()...');
    try {
      const result = await athomeDataService.getAthomeData(
        property.property_number,
        property.property_type,
        property.storage_location
      );
      console.log(`   📊 Result:`, JSON.stringify(result, null, 2));
      if (result.data && result.data.length > 0) {
        console.log(`   ✅ Success: ${result.data.length} data items found`);
        result.data.slice(0, 3).forEach((item: any, index: number) => {
          console.log(`      ${index + 1}. ${item.imageUrl?.substring(0, 80)}...`);
        });
      } else {
        console.log('   ⚠️ No data returned (empty array)');
      }
    } catch (err: any) {
      console.error(`   ❌ Error: ${err.message}`);
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

testRealPublicProperty();
