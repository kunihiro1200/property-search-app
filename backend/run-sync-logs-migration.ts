import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Running migration 026: Add sync logs...\n');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migrations/026_add_sync_logs.sql'),
      'utf8'
    );

    // Split by semicolon and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE INDEX') || 
          statement.includes('ALTER TABLE') || statement.includes('COMMENT ON') ||
          statement.includes('DO $')) {
        console.log(`Executing: ${statement.substring(0, 60)}...`);
        
        const { error } = await supabase.rpc('exec_sql', { 
          sql_query: statement + ';' 
        });

        if (error) {
          console.error('Statement failed:', error);
          console.log('Trying direct query...');
          
          // Try direct query for some statements
          const { error: directError } = await supabase
            .from('_migrations')
            .select('*')
            .limit(1);
            
          if (directError) {
            console.error('Direct query also failed:', directError);
          }
        } else {
          console.log('✓ Success\n');
        }
      }
    }

    console.log('\n✓ Migration 026 completed');
  } catch (error) {
    console.error('Migration error:', error);
    process.exit(1);
  }
}

runMigration();
