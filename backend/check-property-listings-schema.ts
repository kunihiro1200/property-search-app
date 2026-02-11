import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPropertyListingsSchema() {
  console.log('🔍 Checking property_listings table schema...\n');

  try {
    // property_listingsテーブルから1件取得してカラムを確認
    const { data, error } = await supabase
      .from('property_listings')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching property_listings:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data found in property_listings table');
      return;
    }

    const columns = Object.keys(data[0]);
    console.log(`✅ Found ${columns.length} columns in property_listings table:\n`);

    // 重要なカラムをチェック
    const requiredColumns = ['pet_allowed', 'property_about'];
    
    console.log('📋 Required columns check:');
    for (const col of requiredColumns) {
      const exists = columns.includes(col);
      console.log(`  ${exists ? '✅' : '❌'} ${col}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    }

    console.log('\n📋 All columns:');
    columns.sort().forEach(col => {
      console.log(`  - ${col}`);
    });

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkPropertyListingsSchema();
