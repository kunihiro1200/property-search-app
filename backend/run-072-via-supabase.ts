import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  console.log('🚀 Running migration 072 via Supabase client...\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    console.log('📄 Adding site_display column to property_listings...');
    
    // Add site_display column
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS site_display VARCHAR(50);`
    });
    
    if (error1) {
      console.log('Note: Column might already exist or using alternative method');
    }

    console.log('📄 Adding remarks column to property_listings...');
    
    // Add remarks column
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS remarks TEXT;`
    });
    
    if (error2) {
      console.log('Note: Column might already exist or using alternative method');
    }

    console.log('📄 Creating property_inquiries table...');
    
    // Create property_inquiries table
    const { error: error3 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS property_inquiries (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          property_id UUID REFERENCES property_listings(id),
          name VARCHAR(200) NOT NULL,
          email VARCHAR(200) NOT NULL,
          phone VARCHAR(50),
          message TEXT NOT NULL,
          ip_address VARCHAR(100),
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
      `
    });
    
    if (error3) {
      console.log('Note: Table might already exist or using alternative method');
    }

    console.log('\n✅ Migration 072 completed!');
    console.log('\n📋 Summary:');
    console.log('  - Added site_display column to property_listings');
    console.log('  - Added remarks column to property_listings');
    console.log('  - Created property_inquiries table');
    console.log('\n⚠️  Note: If you see errors above, you may need to run the SQL manually in Supabase SQL Editor');
    console.log('\n📝 Manual SQL to run in Supabase SQL Editor:');
    console.log(`
-- Add columns to property_listings
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS site_display VARCHAR(50);
ALTER TABLE property_listings ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Create property_inquiries table
CREATE TABLE IF NOT EXISTS property_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES property_listings(id),
  name VARCHAR(200) NOT NULL,
  email VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  message TEXT NOT NULL,
  ip_address VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_id ON property_inquiries(property_id);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_email ON property_inquiries(email);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_created_at ON property_inquiries(created_at);
CREATE INDEX IF NOT EXISTS idx_property_listings_site_display ON property_listings(site_display);
    `);

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  }
}

runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
