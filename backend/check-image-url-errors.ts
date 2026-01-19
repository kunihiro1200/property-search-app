import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkImageUrlErrors() {
  console.log('🔍 JSONパースエラーの物件を確認中...\n');

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  const errorProperties = ['AA5920', 'AA4876', 'AA5143', 'AA4695', 'AA6174', 'AA9732', 'AA10567'];

  for (const propertyNumber of errorProperties) {
    const { data, error } = await supabase
      .from('property_listings')
      .select('property_number, image_url')
      .eq('property_number', propertyNumber)
      .single();

    if (error) {
      console.error(`❌ ${propertyNumber}: エラー`, error);
      continue;
    }

    console.log(`\n📋 ${propertyNumber}:`);
    console.log(`image_url: ${data.image_url?.substring(0, 200)}...`);
    
    try {
      const parsed = JSON.parse(data.image_url);
      console.log(`✅ パース成功: ${parsed.length}枚`);
    } catch (e: any) {
      console.log(`❌ パースエラー: ${e.message}`);
    }
  }
}

checkImageUrlErrors();
