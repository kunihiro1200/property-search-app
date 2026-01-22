import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkInitials() {
  console.log('Checking employee initials...\n');

  const { data: employees, error } = await supabase
    .from('employees')
    .select('id, name, email, initials, is_active')
    .eq('is_active', true)
    .order('name');

  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }

  if (!employees || employees.length === 0) {
    console.log('No active employees found');
    return;
  }

  console.log(`Found ${employees.length} active employees:\n`);
  
  employees.forEach((emp) => {
    console.log(`Name: ${emp.name}`);
    console.log(`Email: ${emp.email}`);
    console.log(`Initials: ${emp.initials || '(null)'}`);
    console.log(`Active: ${emp.is_active}`);
    console.log('---');
  });
}

checkInitials()
  .then(() => {
    console.log('\nCheck complete');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
