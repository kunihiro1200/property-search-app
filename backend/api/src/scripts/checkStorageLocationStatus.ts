// 公開物件のstorage_location状況を確認するスクリプト
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkStorageLocationStatus() {
  console.log('🔍 Checking storage_location status for public properties...\n');
  
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  try {
    // 公開物件を取得（atbb_statusに「公開中」を含む）
    const { data: publicProperties, error } = await supabase
      .from('property_listings')
      .select('property_number, atbb_status, storage_location, property_type')
      .or('atbb_status.ilike.%公開中%')
      .order('property_number');
    
    if (error) {
      console.error('❌ Error fetching properties:', error);
      return;
    }
    
    console.log(`📊 Total public properties: ${publicProperties?.length || 0}\n`);
    
    // storage_locationの状況を分析
    const withStorage = publicProperties?.filter(p => p.storage_location && p.storage_location.trim() !== '') || [];
    const withoutStorage = publicProperties?.filter(p => !p.storage_location || p.storage_location.trim() === '') || [];
    
    console.log(`✅ With storage_location: ${withStorage.length}`);
    console.log(`❌ Without storage_location: ${withoutStorage.length}\n`);
    
    // storage_locationがない物件の例を表示
    if (withoutStorage.length > 0) {
      console.log('❌ Examples of properties without storage_location:');
      withoutStorage.slice(0, 10).forEach(p => {
        console.log(`   - ${p.property_number} (${p.property_type}) [${p.atbb_status}]`);
      });
      
      if (withoutStorage.length > 10) {
        console.log(`   ... and ${withoutStorage.length - 10} more\n`);
      }
    }
    
    // storage_locationがある物件の例を表示
    if (withStorage.length > 0) {
      console.log('\n✅ Examples of properties with storage_location:');
      withStorage.slice(0, 5).forEach(p => {
        console.log(`   - ${p.property_number}: ${p.storage_location?.substring(0, 60)}...`);
      });
    }
    
    // 結論
    console.log('\n\n📋 Summary:');
    console.log(`   Total public properties: ${publicProperties?.length || 0}`);
    console.log(`   With storage_location: ${withStorage.length} (${Math.round(withStorage.length / (publicProperties?.length || 1) * 100)}%)`);
    console.log(`   Without storage_location: ${withoutStorage.length} (${Math.round(withoutStorage.length / (publicProperties?.length || 1) * 100)}%)`);
    
    if (withoutStorage.length > 0) {
      console.log('\n⚠️ Impact:');
      console.log('   - Properties without storage_location cannot display:');
      console.log('     • おすすめコメント (recommended comments)');
      console.log('     • 画像URL (image URLs)');
      console.log('\n💡 Solution:');
      console.log('   1. Check if spreadsheet has "保存場所" column populated');
      console.log('   2. Re-sync storage_location from spreadsheet to database');
      console.log('   3. Re-run populatePropertyDetails.ts');
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkStorageLocationStatus();
