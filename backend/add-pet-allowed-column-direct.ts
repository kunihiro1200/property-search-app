import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function addPetAllowedColumn() {
  console.log('🚀 Adding pet_allowed column to property_listings table...\n');

  try {
    // まず、カラムが既に存在するか確認
    const { data: testData, error: testError } = await supabase
      .from('property_listings')
      .select('pet_allowed')
      .limit(1);

    if (!testError) {
      console.log('✅ pet_allowed column already exists!');
      return;
    }

    if (testError && !testError.message.includes('column "pet_allowed" does not exist')) {
      console.error('❌ Unexpected error:', testError);
      return;
    }

    console.log('⚠️ pet_allowed column does not exist. Please run the following SQL in Supabase SQL Editor:\n');
    console.log('```sql');
    console.log('ALTER TABLE property_listings');
    console.log('ADD COLUMN IF NOT EXISTS pet_allowed TEXT;');
    console.log('');
    console.log("COMMENT ON COLUMN property_listings.pet_allowed IS 'ペット可否（BB列）- マンションの場合のみ使用';");
    console.log('```\n');
    
    console.log('📝 Steps:');
    console.log('1. Open Supabase Dashboard: https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Paste the SQL above');
    console.log('5. Click "Run"');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

addPetAllowedColumn();
