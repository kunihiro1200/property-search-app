import dotenv from 'dotenv';
import path from 'path';
import { Client } from 'pg';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function runMigration() {
  console.log('🚀 Running Migration 099: Fix seller_deletion_audit to use seller_number as KEY\n');

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

    // Drop existing table
    console.log('🗑️  Dropping existing seller_deletion_audit table...');
    await client.query('DROP TABLE IF EXISTS seller_deletion_audit CASCADE;');
    console.log('✅ Table dropped\n');

    // Create new table with seller_number as key
    console.log('📝 Creating seller_deletion_audit table with seller_number as KEY...');
    await client.query(`
      CREATE TABLE seller_deletion_audit (
        id SERIAL PRIMARY KEY,
        seller_number VARCHAR(50) NOT NULL UNIQUE,
        deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        deleted_by VARCHAR(100) DEFAULT 'auto_sync',
        reason TEXT,
        seller_data JSONB NOT NULL,
        can_recover BOOLEAN DEFAULT TRUE,
        recovered_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
        recovered_by VARCHAR(100) DEFAULT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Table created\n');

    // Add comments
    console.log('💬 Adding column comments...');
    await client.query(`
      COMMENT ON TABLE seller_deletion_audit IS 'Audit log for all seller deletions with full backup data for recovery';
      COMMENT ON COLUMN seller_deletion_audit.seller_number IS 'Seller number (e.g., AA12345) - PRIMARY KEY for lookups';
      COMMENT ON COLUMN seller_deletion_audit.deleted_at IS 'When the seller was deleted';
      COMMENT ON COLUMN seller_deletion_audit.deleted_by IS 'Who/what deleted the seller (auto_sync, admin, etc.)';
      COMMENT ON COLUMN seller_deletion_audit.reason IS 'Reason for deletion (e.g., "Removed from spreadsheet")';
      COMMENT ON COLUMN seller_deletion_audit.seller_data IS 'Full JSON backup of seller data for recovery';
      COMMENT ON COLUMN seller_deletion_audit.can_recover IS 'Whether this seller can be recovered';
      COMMENT ON COLUMN seller_deletion_audit.recovered_at IS 'When the seller was recovered (if applicable)';
      COMMENT ON COLUMN seller_deletion_audit.recovered_by IS 'Who recovered the seller';
    `);
    console.log('✅ Comments added\n');

    // Create indexes
    console.log('📊 Creating indexes...');
    await client.query('CREATE INDEX idx_seller_deletion_audit_seller_number ON seller_deletion_audit(seller_number);');
    await client.query('CREATE INDEX idx_seller_deletion_audit_deleted_at ON seller_deletion_audit(deleted_at);');
    await client.query('CREATE INDEX idx_seller_deletion_audit_can_recover ON seller_deletion_audit(can_recover) WHERE can_recover = TRUE;');
    console.log('✅ Indexes created\n');

    // Verify
    console.log('🔍 Verifying migration...');
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'seller_deletion_audit'
      ORDER BY ordinal_position;
    `);

    console.log('📋 Table structure:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
    });

    const hasSellerIdColumn = result.rows.some(row => row.column_name === 'seller_id');
    const hasSellerNumberColumn = result.rows.some(row => row.column_name === 'seller_number');

    console.log('');
    if (hasSellerIdColumn) {
      console.log('❌ seller_id column still exists (should be removed)');
    } else {
      console.log('✅ seller_id column removed successfully');
    }

    if (hasSellerNumberColumn) {
      console.log('✅ seller_number column exists');
    } else {
      console.log('❌ seller_number column missing');
    }

    console.log('\n📊 Summary:');
    console.log('   - seller_deletion_audit table recreated');
    console.log('   - seller_id column removed');
    console.log('   - seller_number is now the KEY');
    console.log('   - Ready for deletion sync!');

    console.log('\n🎉 Migration 099 completed successfully!');

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
