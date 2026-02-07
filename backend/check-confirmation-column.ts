import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConfirmationColumn() {
  console.log('Checking if confirmation_to_assignee column exists in buyers table...\n');

  try {
    // Try to select the column
    const { data, error } = await supabase
      .from('buyers')
      .select('buyer_number, confirmation_to_assignee')
      .limit(1);

    if (error) {
      console.error('❌ Error:', error.message);
      if (error.message.includes('column') && error.message.includes('does not exist')) {
        console.log('\n⚠️  confirmation_to_assignee column does NOT exist in buyers table');
        console.log('✅ Migration is needed');
        return false;
      }
      throw error;
    }

    console.log('✅ confirmation_to_assignee column EXISTS in buyers table');
    console.log('📊 Sample data:', data);
    console.log('\n✅ No migration needed - column already exists');
    return true;
  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    return false;
  }
}

checkConfirmationColumn()
  .then((exists) => {
    process.exit(exists ? 0 : 1);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
