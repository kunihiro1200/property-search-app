import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  
  try {
    console.log('🚀 Starting Migration 051: Add Soft Delete Support');
    console.log('================================================\n');

    // Read the migration SQL file
    const migrationPath = path.join(__dirname, '051_add_soft_delete_support.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Executing migration SQL...');
    console.log('\n⚠️  Please run the following SQL manually in Supabase SQL Editor:\n');
    console.log('='.repeat(80));
    console.log(migrationSQL);
    console.log('='.repeat(80));
    
    console.log('\n✅ Migration SQL prepared successfully!');
    console.log('\nTo apply this migration:');
    console.log('  1. Go to Supabase Dashboard > SQL Editor');
    console.log('  2. Copy and paste the SQL above');
    console.log('  3. Click "Run" to execute');
    console.log('\n💡 To rollback this migration, run:');
    console.log('  Use the SQL from 051_add_soft_delete_support_rollback.sql');

  } catch (error) {
    console.error('\n❌ Migration preparation failed:', error);
    console.error('\nError details:', error);
    throw error;
  }
}

// Run the migration
runMigration()
  .then(() => {
    console.log('\n🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed with error:', error.message);
    process.exit(1);
  });
