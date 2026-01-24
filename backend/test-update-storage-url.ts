import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

async function testUpdateStorageUrl() {
  try {
    const propertyNumber = 'AA886';
    const storageUrl = 'https://drive.google.com/drive/folders/test-folder-id';
    
    console.log('🧪 Testing update-storage-url endpoint...');
    console.log(`Property: ${propertyNumber}`);
    console.log(`Storage URL: ${storageUrl}`);
    
    // ローカル環境のエンドポイントをテスト
    const response = await axios.post(
      `http://localhost:3000/api/public/properties/${propertyNumber}/update-storage-url`,
      { storageUrl },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Response:', response.data);
    
    // データベースを確認
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_KEY!
    );
    
    const { data: property, error } = await supabase
      .from('property_listings')
      .select('property_number, storage_location')
      .eq('property_number', propertyNumber)
      .single();
    
    if (error) {
      console.error('❌ Database error:', error);
    } else {
      console.log('📊 Database value:', property);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

testUpdateStorageUrl();
