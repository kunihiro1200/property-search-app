import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

async function executeSqlDirect(sql: string): Promise<boolean> {
  try {
    // Extract the project reference from the URL
    const projectRef = supabaseUrl.replace('https://', '').split('.')[0];
    
    // Use Supabase Management API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Execution error:', error);
    return false;
  }
}

async function runMigrations() {
  console.log('🚀 Starting calendar webhook and sync migrations (019-020)...\n');
  console.log('⚠️  Note: If direct execution fails, please run the SQL files manually');
  console.log('   via the Supabase Dashboard SQL Editor.\n');

  try {
    // Read SQL files
    const sql019Path = path.join(__dirname, '019_add_calendar_webhook_channels.sql');
    const sql020Path = path.join(__dirname, '020_add_calendar_sync_tokens.sql');
    
    const sql019 = fs.readFileSync(sql019Path, 'utf8');
    const sql020 = fs.readFileSync(sql020Path, 'utf8');

    console.log('📝 Attempting to execute migration 019...');
    const success019 = await executeSqlDirect(sql019);
    
    if (!success019) {
      console.log('⚠️  Automatic execution failed for migration 019');
      console.log('   Please run 019_add_calendar_webhook_channels.sql manually\n');
      console.log('📖 See MIGRATION_019_020_INSTRUCTIONS.md for details\n');
      return false;
    }
    
    console.log('✅ Migration 019 executed\n');

    console.log('📝 Attempting to execute migration 020...');
    const success020 = await executeSqlDirect(sql020);
    
    if (!success020) {
      console.log('⚠️  Automatic execution failed for migration 020');
      console.log('   Please run 020_add_calendar_sync_tokens.sql manually\n');
      console.log('📖 See MIGRATION_019_020_INSTRUCTIONS.md for details\n');
      return false;
    }
    
    console.log('✅ Migration 020 executed\n');

    console.log('✅ All migrations completed!');
    console.log('');
    console.log('📋 Tables created:');
    console.log('  ✓ calendar_webhook_channels');
    console.log('  ✓ calendar_sync_tokens');
    console.log('');
    console.log('🎉 Database is ready for Google Calendar webhook notifications and sync!');
    console.log('');
    console.log('🔍 Run verification: npx ts-node migrations/verify-019-020-migrations.ts');

    return true;
  } catch (error) {
    console.error('❌ Migration failed:', error);
    console.log('\n📖 Please run migrations manually via Supabase Dashboard');
    console.log('   See MIGRATION_019_020_INSTRUCTIONS.md for instructions\n');
    return false;
  }
}

runMigrations().then(success => {
  process.exit(success ? 0 : 1);
});
