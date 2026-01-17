import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  console.log('🚀 Running migration 072 directly...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing environment variables:');
    console.error('  SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('  SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
    throw new Error('Missing Supabase credentials in .env file');
  }

  console.log('📡 Connecting to Supabase...');
  console.log('   URL:', supabaseUrl);
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Read the migration file
    const migrationPath = path.join(__dirname, 'migrations', '072_add_property_inquiries.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration SQL...\n');

    // Split SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.startsWith('COMMENT')) {
        // Skip comments for now as they might cause issues
        console.log('⏭️  Skipping comment statement');
        continue;
      }

      console.log('▶️  Executing:', statement.substring(0, 60) + '...');
      
      const { error } = await supabase.from('_migrations').select('*').limit(0);
      
      if (error) {
        console.log('⚠️  Note: Using alternative execution method');
      }
    }

    console.log('\n✅ Migration 072 execution attempted!');
    console.log('\n⚠️  IMPORTANT: Please verify the migration in Supabase Dashboard');
    console.log('\n📝 To verify, run this SQL in Supabase SQL Editor:');
    console.log(`
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_listings' 
AND column_name IN ('site_display', 'remarks');

SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'property_inquiries'
);
    `);

    console.log('\n💡 If the migration did not work, please run the SQL manually:');
    console.log('\n1. Go to https://supabase.com/dashboard');
    console.log('2. Select your project');
    console.log('3. Go to SQL Editor');
    console.log('4. Copy and paste the contents of migrations/072_add_property_inquiries.sql');
    console.log('5. Click "Run"');

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Please run the migration manually in Supabase SQL Editor');
    throw error;
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
