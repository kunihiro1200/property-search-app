import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🚀 Starting migration 043: AI電話統合機能...\n');
    
    // Read migration file
    const migrationPath = path.join(__dirname, '043_add_phone_integration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Begin transaction
    await client.query('BEGIN');
    
    console.log('📝 Executing migration SQL...');
    await client.query(migrationSQL);
    
    // Verify tables were created
    console.log('\n✅ Verifying tables...');
    const tables = ['call_logs', 'call_transcriptions', 'call_recordings', 'call_keywords'];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`  ✓ Table '${table}' created successfully`);
      } else {
        throw new Error(`Table '${table}' was not created`);
      }
    }
    
    // Verify indexes
    console.log('\n✅ Verifying indexes...');
    const indexResult = await client.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename IN ('call_logs', 'call_transcriptions', 'call_recordings', 'call_keywords')
      ORDER BY indexname;
    `);
    console.log(`  ✓ Created ${indexResult.rows.length} indexes`);
    
    // Verify views
    console.log('\n✅ Verifying views...');
    const views = ['call_logs_with_details', 'call_statistics_daily'];
    
    for (const view of views) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.views 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [view]);
      
      if (result.rows[0].exists) {
        console.log(`  ✓ View '${view}' created successfully`);
      } else {
        throw new Error(`View '${view}' was not created`);
      }
    }
    
    // Verify default keywords
    console.log('\n✅ Verifying default keywords...');
    const keywordResult = await client.query('SELECT COUNT(*) FROM call_keywords');
    console.log(`  ✓ Inserted ${keywordResult.rows[0].count} default keywords`);
    
    // Commit transaction
    await client.query('COMMIT');
    
    console.log('\n✨ Migration 043 completed successfully!\n');
    console.log('📊 Summary:');
    console.log('  - 4 tables created (call_logs, call_transcriptions, call_recordings, call_keywords)');
    console.log('  - Multiple indexes created for performance');
    console.log('  - 2 views created for data access');
    console.log('  - Default keywords inserted');
    console.log('  - Triggers created for updated_at automation\n');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run migration
runMigration()
  .then(() => {
    console.log('✅ Migration script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    process.exit(1);
  });
