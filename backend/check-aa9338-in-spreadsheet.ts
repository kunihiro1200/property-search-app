import dotenv from 'dotenv';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

async function checkAA9338InSpreadsheet() {
  const propertyNumber = 'AA9338';
  
  console.log(`\n🔍 Checking ${propertyNumber} in spreadsheet...`);
  
  try {
    const propertyDetailsService = new PropertyDetailsService();
    const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log('\n✅ Data found in spreadsheet:');
    console.log('- property_number:', details.property_number);
    console.log('- favorite_comment:', details.favorite_comment || '(empty)');
    console.log('- recommended_comments:', details.recommended_comments ? `✅ ${details.recommended_comments.length} items` : '❌ Missing');
    console.log('- property_about:', details.property_about || '(empty)');
    console.log('- athome_data:', details.athome_data ? '✅ Exists' : '❌ Missing');
    
    if (details.recommended_comments) {
      console.log('\n📝 Recommended Comments:');
      details.recommended_comments.forEach((comment: any, index: number) => {
        console.log(`  ${index + 1}. ${comment}`);
      });
    }
    
    if (details.favorite_comment) {
      console.log('\n⭐ Favorite Comment:');
      console.log(`  ${details.favorite_comment}`);
    }
    
    if (details.property_about) {
      console.log('\n📄 Property About:');
      console.log(`  ${details.property_about}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  }
}

checkAA9338InSpreadsheet();
