import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function clearCC10ImageCache() {
  try {
    console.log('🧹 Clearing image cache for CC10...\n');
    
    // CC10のUUIDを取得
    const { data: property, error: fetchError } = await supabase
      .from('property_listings')
      .select('id, property_number, storage_location')
      .eq('property_number', 'CC10')
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching CC10:', fetchError);
      return;
    }
    
    console.log('📋 CC10 information:');
    console.log('  UUID:', property.id);
    console.log('  Property Number:', property.property_number);
    console.log('  Storage Location:', property.storage_location);
    console.log('');
    
    // キャッシュクリアAPIを呼び出し
    const apiUrl = 'http://localhost:3000/api/public/images/clear-cache';
    
    console.log('🔄 Calling cache clear API...');
    console.log('  URL:', apiUrl);
    console.log('  Property ID:', property.id);
    console.log('');
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        propertyId: property.id,
      }),
    });
    
    if (!response.ok) {
      console.error('❌ Error clearing cache:', response.statusText);
      const errorText = await response.text();
      console.error('  Error details:', errorText);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Cache cleared successfully!');
    console.log('  Result:', result);
    console.log('');
    console.log('📝 Next steps:');
    console.log('  1. Open CC10 on the public property site');
    console.log('  2. Verify that the correct images are displayed');
    console.log('  3. Expected images: 外観パース, スクリーンショット 2026-01-04, etc.');
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.log('💡 Note: Make sure the backend server is running on port 3000');
    console.log('   Run: npm run dev (in backend directory)');
  }
}

clearCC10ImageCache();
