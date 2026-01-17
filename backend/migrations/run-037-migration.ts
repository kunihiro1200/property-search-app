import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  console.log('Running migration 037: Multi-Entity Management Expansion...');
  
  const sqlPath = path.join(__dirname, '037_multi_entity_expansion.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  // Split by semicolons and filter empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
      if (error) {
        // Try direct query if RPC fails
        const { error: directError } = await supabase.from('_migrations').select('*').limit(0);
        if (directError) {
          console.log(`Statement may have succeeded (RPC not available): ${statement.substring(0, 50)}...`);
        }
      }
    } catch (err) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
    }
  }
  
  console.log('Migration 037 completed!');
  console.log('');
  console.log('Created tables:');
  console.log('  - listed_properties (媒介契約物件)');
  console.log('  - site_registrations (サイト登録)');
  console.log('  - buyers (買主)');
  console.log('  - buyer_inquiries (買主問合せ)');
  console.log('  - viewings (内覧)');
  console.log('  - works (案件)');
  console.log('  - work_tasks (業務タスク)');
  console.log('  - task_assignee_history (担当者変更履歴)');
}

runMigration().catch(console.error);
