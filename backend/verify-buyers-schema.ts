/**
 * Verify that all text fields in buyers table are TEXT type
 * This script checks for any remaining VARCHAR(50) fields
 */
import { Pool } from 'pg';
import { config } from 'dotenv';

config();

interface ColumnInfo {
  column_name: string;
  data_type: string;
  character_maximum_length: number | null;
}

async function verifyBuyersSchema() {
  console.log('🔍 Verifying buyers table schema...\n');

  // Parse Supabase URL to get connection details
  const supabaseUrl = process.env.SUPABASE_URL!;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    console.error('Could not parse Supabase project reference from URL');
    process.exit(1);
  }

  // Construct direct database URL
  const databaseUrl = process.env.DATABASE_URL || 
    `postgresql://postgres.${projectRef}:${process.env.SUPABASE_DB_PASSWORD}@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres`;

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const result = await pool.query(`
      SELECT 
        column_name,
        data_type,
        character_maximum_length
      FROM information_schema.columns
      WHERE table_name = 'buyers'
        AND table_schema = 'public'
      ORDER BY column_name
    `);

    if (!result.rows || result.rows.length === 0) {
      console.error('❌ No columns found for buyers table');
      console.error('   Make sure the buyers table exists');
      await pool.end();
      process.exit(1);
    }

    const data = result.rows as ColumnInfo[];
    console.log(`📋 Found ${data.length} columns in buyers table\n`);

    // Filter text-like columns
    const textColumns = data.filter(col => 
      col.data_type === 'character varying' || 
      col.data_type === 'text' ||
      col.data_type === 'varchar'
    );

    console.log(`📝 Text columns: ${textColumns.length}\n`);

    // Find VARCHAR(50) fields
    const varchar50Fields = textColumns.filter(col => 
      col.data_type === 'character varying' && 
      col.character_maximum_length === 50
    );

    if (varchar50Fields.length > 0) {
      console.error(`❌ Found ${varchar50Fields.length} VARCHAR(50) fields:\n`);
      varchar50Fields.forEach(field => {
        console.error(`   - ${field.column_name}: ${field.data_type}(${field.character_maximum_length})`);
      });
      console.error('\n⚠️  These fields need to be converted to TEXT');
      console.error('   Run Migration 050 to fix this issue');
      console.error('   See: backend/MIGRATION_050_EXECUTION_GUIDE.md');
      await pool.end();
      process.exit(1);
    }

    // Find any other VARCHAR fields (not 50)
    const otherVarcharFields = textColumns.filter(col => 
      col.data_type === 'character varying' && 
      col.character_maximum_length !== 50
    );

    if (otherVarcharFields.length > 0) {
      console.log(`ℹ️  Found ${otherVarcharFields.length} VARCHAR fields with other lengths:\n`);
      otherVarcharFields.forEach(field => {
        console.log(`   - ${field.column_name}: ${field.data_type}(${field.character_maximum_length})`);
      });
      console.log('\n   These are OK (not VARCHAR(50))');
    }

    // Count TEXT fields
    const textFields = textColumns.filter(col => col.data_type === 'text');
    console.log(`\n✅ TEXT fields: ${textFields.length}`);

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 Schema Verification Summary');
    console.log('='.repeat(60));
    console.log(`Total text columns: ${textColumns.length}`);
    console.log(`TEXT type: ${textFields.length}`);
    console.log(`VARCHAR(50): ${varchar50Fields.length}`);
    console.log(`Other VARCHAR: ${otherVarcharFields.length}`);
    console.log('='.repeat(60));

    if (varchar50Fields.length === 0) {
      console.log('\n✅ Schema verification passed!');
      console.log('   All text fields are properly typed');
      console.log('   No VARCHAR(50) fields found');
      console.log('\n📝 Next steps:');
      console.log('   1. Run buyer sync: npx ts-node sync-buyers.ts');
      console.log('   2. Verify counts: npx ts-node check-buyer-count-comparison.ts');
      await pool.end();
      process.exit(0);
    } else {
      console.log('\n❌ Schema verification failed!');
      console.log('   VARCHAR(50) fields found');
      console.log('\n📝 Next steps:');
      console.log('   1. Review: backend/MIGRATION_050_EXECUTION_GUIDE.md');
      console.log('   2. Execute Migration 050');
      console.log('   3. Re-run this verification script');
      await pool.end();
      process.exit(1);
    }

  } catch (err: any) {
    console.error('❌ Unexpected error:', err.message);
    console.error(err.stack);
    await pool.end();
    process.exit(1);
  }
}

verifyBuyersSchema();

