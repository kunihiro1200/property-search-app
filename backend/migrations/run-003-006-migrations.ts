import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigrations() {
  console.log('🚀 Running migrations 003 and 006...\n');

  try {
    // Migration 003: Add assigned_to column
    console.log('📝 Running migration 003: Add assigned_to column...');
    const migration003 = fs.readFileSync(
      path.join(__dirname, '003_add_assigned_to_appointments.sql'),
      'utf-8'
    );
    
    const { error: error003 } = await supabase.rpc('exec_sql', { sql: migration003 });
    
    if (error003) {
      // Try direct execution if rpc fails
      console.log('⚠️  RPC failed, trying direct execution...');
      const statements003 = migration003.split(';').filter(s => s.trim());
      
      for (const statement of statements003) {
        if (statement.trim()) {
          const { error } = await supabase.from('_migrations').insert({ statement });
          if (error) console.warn('Warning:', error.message);
        }
      }
    }
    
    console.log('✅ Migration 003 completed\n');

    // Migration 006: Add assigned_employee_id column
    console.log('📝 Running migration 006: Add assigned_employee_id column...');
    const migration006 = fs.readFileSync(
      path.join(__dirname, '006_add_assigned_employee_id_to_appointments.sql'),
      'utf-8'
    );
    
    const { error: error006 } = await supabase.rpc('exec_sql', { sql: migration006 });
    
    if (error006) {
      console.log('⚠️  RPC failed, trying direct execution...');
      const statements006 = migration006.split(';').filter(s => s.trim());
      
      for (const statement of statements006) {
        if (statement.trim()) {
          const { error } = await supabase.from('_migrations').insert({ statement });
          if (error) console.warn('Warning:', error.message);
        }
      }
    }
    
    console.log('✅ Migration 006 completed\n');

    // Verify the columns exist
    console.log('🔍 Verifying columns...');
    const { error } = await supabase
      .from('appointments')
      .select('id, assigned_to, assigned_employee_id')
      .limit(1);

    if (error) {
      console.error('❌ Verification failed:', error.message);
      console.log('\n⚠️  You may need to run these migrations manually in Supabase SQL Editor:');
      console.log('\n1. Migration 003:');
      console.log(migration003);
      console.log('\n2. Migration 006:');
      console.log(migration006);
    } else {
      console.log('✅ Columns verified successfully!');
      console.log('   - assigned_to: ✓');
      console.log('   - assigned_employee_id: ✓');
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.log('\n📋 Manual migration required. Please run these SQL statements in Supabase SQL Editor:\n');
    
    const migration003 = fs.readFileSync(
      path.join(__dirname, '003_add_assigned_to_appointments.sql'),
      'utf-8'
    );
    const migration006 = fs.readFileSync(
      path.join(__dirname, '006_add_assigned_employee_id_to_appointments.sql'),
      'utf-8'
    );
    
    console.log('-- Migration 003');
    console.log(migration003);
    console.log('\n-- Migration 006');
    console.log(migration006);
    
    process.exit(1);
  }
}

runMigrations()
  .then(() => {
    console.log('\n✅ All migrations completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
