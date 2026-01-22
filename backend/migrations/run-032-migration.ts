import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('🔄 Running migration 032: Add missing call mode fields...\n');

  try {
    // Read the migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '032_add_missing_call_mode_fields.sql'),
      'utf-8'
    );

    // Execute the migration
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });

    if (error) {
      // If exec_sql doesn't exist, try direct execution
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('COMMENT'));

      for (const statement of statements) {
        const { error: stmtError } = await supabase.rpc('exec', { 
          query: statement 
        });
        
        if (stmtError) {
          console.error('Error executing statement:', statement);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration 032 completed successfully!\n');
    console.log('Added columns:');
    console.log('  - inquiry_source (問い合わせ経路)');
    console.log('  - inquiry_medium (問い合わせ媒体)');
    console.log('  - inquiry_content (問い合わせ内容)');
    console.log('  - sale_reason (売却理由)');
    console.log('  - desired_timing (希望時期)');
    console.log('  - desired_price (売却希望価格)');
    console.log('  - notes (備考)');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

runMigration().catch(console.error);
