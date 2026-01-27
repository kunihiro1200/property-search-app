// AA13069のproperty_aboutを物件スプレッドシートから同期
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { PropertyService } from './src/services/PropertyService';
import { PropertyDetailsService } from './src/services/PropertyDetailsService';

async function syncPropertyAbout() {
  console.log('🔍 Syncing AA13069 property_about...\n');

  const propertyNumber = 'AA13069';

  try {
    // 1. 現在のデータベース状態を確認
    console.log('📊 Step 1: Check current database state');
    const propertyDetailsService = new PropertyDetailsService();
    const currentDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
    
    console.log('Current property_about:', currentDetails.property_about || 'null');

    // 2. 物件スプレッドシートから取得
    console.log('\n🔄 Step 2: Fetch from property spreadsheet');
    const propertyService = new PropertyService();
    const propertyAbout = await propertyService.getPropertyAbout(propertyNumber);
    
    console.log('Fetched property_about:', propertyAbout || 'null');

    // 3. データベースに保存
    if (propertyAbout) {
      console.log('\n💾 Step 3: Save to database');
      await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
        property_about: propertyAbout
      });
      console.log('✅ Successfully saved property_about');

      // 4. 確認
      console.log('\n✅ Step 4: Verify');
      const updatedDetails = await propertyDetailsService.getPropertyDetails(propertyNumber);
      console.log('Updated property_about:', updatedDetails.property_about || 'null');
    } else {
      console.log('\n⚠️  property_about not found in property spreadsheet');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  }
}

syncPropertyAbout();
