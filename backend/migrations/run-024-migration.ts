import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  console.error('SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('Starting Migration 024: Fix employee initials...\n');

    // Update each employee's initials directly
    const updates = [
      { email: 'tomoko.kunihiro@ifoo-oita.com', initials: 'K' },
      { email: 'yuuko.yamamoto@ifoo-oita.com', initials: 'Y' },
      { email: 'hiromitsu-kakui@ifoo-oita.com', initials: 'I' },
      { email: 'tenma.ura@ifoo-oita.com', initials: 'U' },
      { email: 'yurine.kimura@ifoo-oita.com', initials: 'R' },
      { email: 'naomi.hirose@ifoo-oita.com', initials: 'H' },
    ];

    for (const update of updates) {
      console.log(`Updating ${update.email} to ${update.initials}...`);
      const { error } = await supabase
        .from('employees')
        .update({ initials: update.initials })
        .eq('email', update.email);
      
      if (error) {
        console.error(`Error updating ${update.email}:`, error);
        throw error;
      }
    }

    console.log('\n✅ Migration 024 completed successfully!');
    
    // Verify the changes
    console.log('\nVerifying changes...');
    const { data: employees, error: selectError } = await supabase
      .from('employees')
      .select('name, email, initials')
      .eq('is_active', true)
      .order('name');

    if (selectError) {
      console.error('Error verifying:', selectError);
    } else {
      console.log('\nUpdated employee initials:');
      employees?.forEach(emp => {
        console.log(`  ${emp.name}: ${emp.initials}`);
      });
    }

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

runMigration()
  .then(() => {
    console.log('\nMigration complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
