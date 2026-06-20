import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { PropertyService } from '../services/PropertyService';
import { RecommendedCommentService } from '../services/RecommendedCommentService';
import { FavoriteCommentService } from '../services/FavoriteCommentService';
import { AthomeDataService } from '../services/AthomeDataService';
import { PropertyDetailsService } from '../services/PropertyDetailsService';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function saveAA13231ToDatabase() {
  try {
    console.log('🔍 Fetching AA13231 data and saving to database...\n');
    
    // AA13231の物件情報を取得
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA13231')
      .single();
    
    if (error || !property) {
      console.error('❌ Error fetching property:', error);
      return;
    }
    
    console.log('📋 Property Info:');
    console.log(`   Property Number: ${property.property_number}`);
    console.log(`   Property Type: ${property.property_type}`);
    console.log(`   ATBB Status: ${property.atbb_status}`);
    console.log('');
    
    const propertyService = new PropertyService();
    const recommendedCommentService = new RecommendedCommentService();
    const favoriteCommentService = new FavoriteCommentService();
    const athomeDataService = new AthomeDataService();
    const propertyDetailsService = new PropertyDetailsService();
    
    // 1. Property About
    console.log('1️⃣ Fetching Property About...');
    const propertyAbout = await propertyService.getPropertyAbout(property.property_number);
    console.log(`   ${propertyAbout ? '✅' : '⚠️'} Property About: ${propertyAbout ? 'Found' : 'Not found'}`);
    
    // 2. Recommended Comments
    console.log('2️⃣ Fetching Recommended Comments...');
    const recommendedResult = await recommendedCommentService.getRecommendedComment(
      property.property_number,
      property.property_type,
      property.id
    );
    console.log(`   ${recommendedResult.comments.length > 0 ? '✅' : '⚠️'} Recommended Comments: ${recommendedResult.comments.length} rows found`);
    
    // 3. Favorite Comment
    console.log('3️⃣ Fetching Favorite Comment...');
    const favoriteResult = await favoriteCommentService.getFavoriteComment(property.id);
    console.log(`   ${favoriteResult.comment ? '✅' : '⚠️'} Favorite Comment: ${favoriteResult.comment ? 'Found' : 'Not found'}`);
    
    // 4. Athome Data (Image URLs)
    console.log('4️⃣ Fetching Athome Data...');
    const athomeResult = await athomeDataService.getAthomeData(
      property.property_number,
      property.property_type,
      property.storage_location
    );
    console.log(`   ${athomeResult.data.length > 0 ? '✅' : '⚠️'} Athome Data: ${athomeResult.data.length} items found`);
    
    // 5. Save to database
    console.log('\n💾 Saving to property_details table...');
    const success = await propertyDetailsService.upsertPropertyDetails(
      property.property_number,
      {
        property_about: propertyAbout,
        recommended_comments: recommendedResult.comments,
        athome_data: athomeResult.data,
        favorite_comment: favoriteResult.comment
      }
    );
    
    if (success) {
      console.log('✅ Successfully saved AA13231 data to database!');
      
      // Verify
      console.log('\n🔍 Verifying saved data...');
      const savedData = await propertyDetailsService.getPropertyDetails(property.property_number);
      console.log('   Property About:', savedData.property_about ? '✅ Saved' : '❌ Not saved');
      console.log('   Recommended Comments:', savedData.recommended_comments ? `✅ ${savedData.recommended_comments.length} rows saved` : '❌ Not saved');
      console.log('   Favorite Comment:', savedData.favorite_comment ? '✅ Saved' : '❌ Not saved');
      console.log('   Athome Data:', savedData.athome_data ? `✅ ${savedData.athome_data.length} items saved` : '❌ Not saved');
    } else {
      console.error('❌ Failed to save data to database');
    }
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

saveAA13231ToDatabase();
