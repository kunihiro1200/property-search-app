import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function debugAA505PropertyAbout() {
  console.log('🔍 Debugging AA505 property_about...\n');

  try {
    // 1. property_listingsテーブルからAA505を取得
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_number, property_about, pre_viewing_notes')
      .eq('property_number', 'AA505')
      .single();

    if (propertyError || !property) {
      console.error('❌ Property not found:', propertyError);
      return;
    }

    console.log('✅ Property AA505:');
    console.log(`  - property_number: ${property.property_number}`);
    console.log(`  - property_about: ${property.property_about ? `"${property.property_about}"` : 'NULL'}`);
    console.log(`  - pre_viewing_notes: ${property.pre_viewing_notes ? `"${property.pre_viewing_notes}"` : 'NULL'}`);

    // 2. property_about の長さを確認
    if (property.property_about) {
      console.log(`\n📏 property_about length: ${property.property_about.length} characters`);
      
      // 最初の100文字を表示
      const preview = property.property_about.substring(0, 100);
      console.log(`\n📝 Preview (first 100 chars):`);
      console.log(`"${preview}${property.property_about.length > 100 ? '...' : ''}"`);
    }

    // 3. pre_viewing_notes の長さを確認
    if (property.pre_viewing_notes) {
      console.log(`\n📏 pre_viewing_notes length: ${property.pre_viewing_notes.length} characters`);
      
      // 最初の100文字を表示
      const preview = property.pre_viewing_notes.substring(0, 100);
      console.log(`\n📝 Preview (first 100 chars):`);
      console.log(`"${preview}${property.pre_viewing_notes.length > 100 ? '...' : ''}"`);
    }

    // 4. 全てのカラムを取得して確認
    const { data: fullProperty, error: fullError } = await supabase
      .from('property_listings')
      .select('*')
      .eq('property_number', 'AA505')
      .single();

    if (fullError) {
      console.error('\n❌ Error fetching full property:', fullError);
      return;
    }

    console.log('\n✅ Full property data retrieved');
    console.log(`  - Has property_about: ${!!fullProperty.property_about}`);
    console.log(`  - Has pre_viewing_notes: ${!!fullProperty.pre_viewing_notes}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

debugAA505PropertyAbout();
