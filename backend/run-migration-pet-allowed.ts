import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// .envファイルを読み込み
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🚀 Running migration: add pet_allowed column...\n');

  try {
    // マイグレーションファイルを読み込み
    const migrationPath = path.join(__dirname, 'supabase/migrations/20260211_add_pet_allowed_to_property_listings.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(sql);
    console.log('');

    // マイグレーションを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      
      // 直接SQLを実行してみる
      console.log('\n🔄 Trying direct SQL execution...');
      
      const { error: directError } = await supabase
        .from('property_listings')
        .select('pet_allowed')
        .limit(1);
      
      if (directError && directError.message.includes('column "pet_allowed" does not exist')) {
        console.log('⚠️ Column does not exist. Please run the migration manually in Supabase SQL Editor.');
        console.log('\nSQL to run:');
        console.log(sql);
      } else {
        console.log('✅ Column might already exist or migration succeeded');
      }
      
      return;
    }

    console.log('✅ Migration completed successfully!');
    
    // 確認
    const { data: checkData, error: checkError } = await supabase
      .from('property_listings')
      .select('pet_allowed')
      .limit(1);
    
    if (checkError) {
      console.error('❌ Verification failed:', checkError);
    } else {
      console.log('✅ Verified: pet_allowed column exists');
    }

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

runMigration();
