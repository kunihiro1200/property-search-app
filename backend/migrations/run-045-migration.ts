import * as fs from 'fs';
import * as path from 'path';

console.log('='.repeat(80));
console.log('MIGRATION 045: Add distribution_areas to property_listings');
console.log('='.repeat(80));
console.log('\nPlease run the following SQL in your Supabase SQL Editor:\n');
console.log('Dashboard > SQL Editor > New Query\n');
console.log('='.repeat(80));

const migrationPath = path.join(__dirname, '045_add_distribution_areas_to_property_listings.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log(migrationSQL);
console.log('='.repeat(80));
console.log('\nAfter running the SQL, verify with:');
console.log('  npx ts-node migrations/verify-045-migration.ts');
console.log('='.repeat(80));
