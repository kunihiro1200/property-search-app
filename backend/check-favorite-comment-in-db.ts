// データベースから直接お気に入り文言を確認するスクリプト
import dotenv from 'dotenv';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

dotenv.config();

async function checkFavoriteComments() {
  console.log('🔍 Checking favorite comments in database...\n');
  
  const propertyDetailsService = new PropertyDetailsService();
  
  // テストした物件番号
  const testProperties = ['CC20', 'CC16', 'AA13341', 'CC14'];
  
  for (const propertyNumber of testProperties) {
    const details = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log(`\n📝 ${propertyNumber}:`);
    console.log(`   favorite_comment: ${details.favorite_comment ? '✅ EXISTS' : '❌ NULL'}`);
    
    if (details.favorite_comment) {
      console.log(`   Content: "${details.favorite_comment.substring(0, 100)}..."`);
    }
  }
  
  console.log('\n✅ Check complete!');
  process.exit(0);
}

checkFavoriteComments();
