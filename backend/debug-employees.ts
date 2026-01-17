import { EmployeeUtils } from './src/utils/employeeUtils';

async function debugEmployees() {
  const employeeUtils = new EmployeeUtils();
  
  console.log('=== Checking for duplicate initials ===');
  const duplicates = await employeeUtils.detectDuplicateInitials();
  
  if (duplicates.length > 0) {
    console.log('⚠️  DUPLICATES FOUND:');
    duplicates.forEach(dup => {
      console.log(`\nInitials: "${dup.initials}"`);
      dup.employees.forEach(emp => {
        console.log(`  - ${emp.name} (${emp.id}) - ${emp.email}`);
      });
    });
  } else {
    console.log('✅ No duplicate initials found');
  }
  
  console.log('\n=== Testing specific lookups ===');
  
  // Test "生野"
  try {
    const ikuno = await employeeUtils.getEmployeeByInitials('生野');
    if (ikuno) {
      console.log('\n"生野" found:', ikuno);
    } else {
      console.log('\n"生野" not found');
    }
  } catch (error: any) {
    console.error('\n"生野" error:', error.message);
  }
  
  // Test "生"
  try {
    const iku = await employeeUtils.getEmployeeByInitials('生');
    if (iku) {
      console.log('\n"生" found:', iku);
    } else {
      console.log('\n"生" not found');
    }
  } catch (error: any) {
    console.error('\n"生" error:', error.message);
  }
  
  // Test "国"
  try {
    const kuni = await employeeUtils.getEmployeeByInitials('国');
    if (kuni) {
      console.log('\n"国" found:', kuni);
    } else {
      console.log('\n"国" not found');
    }
  } catch (error: any) {
    console.error('\n"国" error:', error.message);
  }
  
  process.exit(0);
}

debugEmployees().catch(console.error);
