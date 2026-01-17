import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { extractDisplayName } from '../src/utils/employeeUtils';

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

/**
 * Check if a name is invalid
 */
function isInvalidName(name: string): boolean {
  if (!name || name.trim().length === 0) {
    return true;
  }

  // Check for "不明"
  if (name === '不明' || name === 'Unknown') {
    return true;
  }

  // Check for encrypted-looking strings (Base64 pattern)
  const base64Pattern = /^[A-Za-z0-9+/=]{20,}$/;
  if (base64Pattern.test(name)) {
    return true;
  }

  // Check if email address is used as name
  if (name.includes('@')) {
    return true;
  }

  return false;
}

async function runMigration() {
  try {
    console.log('Starting Migration 028: Fix employee names...\n');

    // Get all employees
    const { data: employees, error: fetchError } = await supabase
      .from('employees')
      .select('id, google_id, email, name, is_active')
      .order('email');

    if (fetchError) {
      console.error('Error fetching employees:', fetchError);
      throw fetchError;
    }

    if (!employees || employees.length === 0) {
      console.log('No employees found');
      return;
    }

    console.log(`Found ${employees.length} employees\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates: Array<{ id: string; oldName: string; newName: string; email: string }> = [];

    for (const employee of employees) {
      console.log(`\nProcessing: ${employee.email}`);
      console.log(`  Current name: "${employee.name}"`);
      console.log(`  Is active: ${employee.is_active}`);

      // Check if name is invalid
      if (!isInvalidName(employee.name)) {
        console.log(`  ✓ Name is valid, skipping`);
        skippedCount++;
        continue;
      }

      console.log(`  ⚠ Invalid name detected`);

      try {
        // Query Supabase Auth for user metadata
        const { data: authData, error: authError } = await supabase.auth.admin.getUserById(
          employee.google_id
        );

        if (authError || !authData.user) {
          console.log(`  ⚠ Could not fetch auth data: ${authError?.message || 'User not found'}`);
          console.log(`  → Using email-based extraction`);
          
          // Fall back to email extraction
          const extractedName = extractDisplayName(null, employee.email);
          
          updates.push({
            id: employee.id,
            oldName: employee.name,
            newName: extractedName,
            email: employee.email,
          });

          console.log(`  → New name: "${extractedName}"`);
          updatedCount++;
          continue;
        }

        // Extract name from user metadata
        const userMetadata = authData.user.user_metadata;
        console.log(`  User metadata:`, {
          full_name: userMetadata?.full_name,
          name: userMetadata?.name,
          given_name: userMetadata?.given_name,
          family_name: userMetadata?.family_name,
        });

        const extractedName = extractDisplayName(userMetadata, employee.email);
        
        updates.push({
          id: employee.id,
          oldName: employee.name,
          newName: extractedName,
          email: employee.email,
        });

        console.log(`  → New name: "${extractedName}"`);
        updatedCount++;

      } catch (error) {
        console.error(`  ✗ Error processing employee:`, error);
        // Continue with next employee
      }
    }

    // Display summary before applying updates
    console.log('\n' + '='.repeat(60));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total employees: ${employees.length}`);
    console.log(`To be updated: ${updatedCount}`);
    console.log(`Skipped (valid names): ${skippedCount}`);
    
    if (updates.length > 0) {
      console.log('\nUpdates to be applied:');
      updates.forEach((update, index) => {
        console.log(`\n${index + 1}. ${update.email}`);
        console.log(`   Old: "${update.oldName}"`);
        console.log(`   New: "${update.newName}"`);
      });
    }

    // Apply updates
    if (updates.length > 0) {
      console.log('\n' + '='.repeat(60));
      console.log('APPLYING UPDATES...');
      console.log('='.repeat(60));

      for (const update of updates) {
        console.log(`\nUpdating ${update.email}...`);
        
        const { error: updateError } = await supabase
          .from('employees')
          .update({ name: update.newName })
          .eq('id', update.id);

        if (updateError) {
          console.error(`  ✗ Error updating:`, updateError);
          throw updateError;
        }

        console.log(`  ✓ Updated successfully`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Migration 028 completed successfully!');
    console.log('='.repeat(60));
    console.log(`Updated: ${updatedCount} employees`);
    console.log(`Skipped: ${skippedCount} employees`);

    // Verify the changes
    console.log('\n' + '='.repeat(60));
    console.log('VERIFICATION');
    console.log('='.repeat(60));
    
    const { data: verifyEmployees, error: verifyError } = await supabase
      .from('employees')
      .select('name, email, is_active')
      .order('email');

    if (verifyError) {
      console.error('Error verifying:', verifyError);
    } else {
      console.log('\nAll employee names:');
      verifyEmployees?.forEach(emp => {
        const status = emp.is_active ? '✓' : '✗';
        const invalid = isInvalidName(emp.name) ? ' ⚠ STILL INVALID' : '';
        console.log(`  ${status} ${emp.email}: "${emp.name}"${invalid}`);
      });
    }

  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ Migration failed:', error);
    console.error('='.repeat(60));
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
