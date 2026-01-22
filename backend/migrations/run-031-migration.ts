import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('=== Running Migration 031: Add seller_number index ===\n');

  try {
    // SQLファイルを読み込む
    const sqlPath = path.join(__dirname, '031_add_seller_number_index.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing SQL...\n');
    console.log(sql);
    console.log('\n');

    // SQLを実行
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }

    console.log('✅ Migration 031 completed successfully!');
    console.log('\nIndexes created:');
    console.log('  - idx_sellers_seller_number (B-tree index for exact match)');
    console.log('  - idx_sellers_seller_number_gin (GIN index for partial match)');
    console.log('\nThis will significantly improve seller_number search performance.');

  } catch (error: any) {
    console.error('Error running migration:', error.message);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('\n✅ Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
