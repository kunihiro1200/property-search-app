import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '.env') });

interface ColumnInfo {
  exists: boolean;
  dataType?: string;
  isNullable?: boolean;
}

interface VerificationResult {
  syncHealthExists: boolean;
  syncHealthColumns?: string[];
  syncHealthRecordCount?: number;
  syncHealthSample?: any;
  syncLogsColumnsExist: {
    missing_sellers_detected: ColumnInfo;
    triggered_by: ColumnInfo;
    health_status: ColumnInfo;
  };
  isComplete: boolean;
}

/**
 * Create PostgreSQL connection pool
 */
function createDatabasePool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please add DATABASE_URL to your .env file');
    console.error('   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
    process.exit(1);
  }
  
  return new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
}

/**
 * Test database connection
 */
async function testConnection(pool: Pool): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Server time: ${result.rows[0].now}`);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}

/**
 * Check if a table exists
 */
async function checkTableExists(
  pool: Pool, 
  tableName: string
): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
    )
  `;
  
  try {
    const result = await pool.query(query, [tableName]);
    return result.rows[0].exists;
  } catch (error: any) {
    console.error(`❌ Failed to check table ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Get table columns
 */
async function getTableColumns(
  pool: Pool,
  tableName: string
): Promise<string[]> {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `;
  
  try {
    const result = await pool.query(query, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error: any) {
    console.error(`❌ Failed to get columns for ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Check if a column exists and get its info
 */
async function checkColumnExists(
  pool: Pool,
  tableName: string,
  columnName: string
): Promise<ColumnInfo> {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
  `;
  
  try {
    const result = await pool.query(query, [tableName, columnName]);
    
    if (result.rows.length === 0) {
      return { exists: false };
    }
    
    const row = result.rows[0];
    return {
      exists: true,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
    };
  } catch (error: any) {
    console.error(`❌ Failed to check column ${tableName}.${columnName}:`, error.message);
    throw error;
  }
}

/**
 * Check sync_logs columns
 */
async function checkSyncLogsColumns(pool: Pool): Promise<{
  missing_sellers_detected: ColumnInfo;
  triggered_by: ColumnInfo;
  health_status: ColumnInfo;
}> {
  const [missingSellers, triggeredBy, healthStatus] = await Promise.all([
    checkColumnExists(pool, 'sync_logs', 'missing_sellers_detected'),
    checkColumnExists(pool, 'sync_logs', 'triggered_by'),
    checkColumnExists(pool, 'sync_logs', 'health_status'),
  ]);
  
  return {
    missing_sellers_detected: missingSellers,
    triggered_by: triggeredBy,
    health_status: healthStatus,
  };
}

/**
 * Get sample data from a table
 */
async function getSampleData(
  pool: Pool,
  tableName: string
): Promise<any | null> {
  const query = `SELECT * FROM ${tableName} LIMIT 1`;
  
  try {
    const result = await pool.query(query);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error: any) {
    console.error(`❌ Failed to get sample data from ${tableName}:`, error.message);
    return null;
  }
}

/**
 * Get record count from a table
 */
async function getRecordCount(
  pool: Pool,
  tableName: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM ${tableName}`;
  
  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  } catch (error: any) {
    console.error(`❌ Failed to count records in ${tableName}:`, error.message);
    return 0;
  }
}

/**
 * Generate verification report
 */
function generateReport(result: VerificationResult): void {
  console.log('\n🔍 Verifying Migration 039 (Direct PostgreSQL Connection)...\n');
  
  // sync_health table
  console.log('1. Checking sync_health table...');
  if (result.syncHealthExists) {
    console.log('✅ sync_health table exists');
    if (result.syncHealthColumns) {
      console.log(`   Columns: ${result.syncHealthColumns.join(', ')}`);
    }
    if (result.syncHealthRecordCount !== undefined) {
      console.log(`   Records: ${result.syncHealthRecordCount}`);
    }
    if (result.syncHealthSample) {
      console.log('   Sample record:');
      const sampleStr = JSON.stringify(result.syncHealthSample, null, 2);
      console.log('   ' + sampleStr.replace(/\n/g, '\n   '));
    }
  } else {
    console.log('❌ sync_health table does NOT exist');
  }
  
  // sync_logs columns
  console.log('\n2. Checking sync_logs table extensions...');
  const columns = result.syncLogsColumnsExist;
  
  if (columns.missing_sellers_detected.exists) {
    console.log(`✅ missing_sellers_detected column exists (type: ${columns.missing_sellers_detected.dataType})`);
  } else {
    console.log('❌ missing_sellers_detected column does NOT exist');
  }
  
  if (columns.triggered_by.exists) {
    console.log(`✅ triggered_by column exists (type: ${columns.triggered_by.dataType})`);
  } else {
    console.log('❌ triggered_by column does NOT exist');
  }
  
  if (columns.health_status.exists) {
    console.log(`✅ health_status column exists (type: ${columns.health_status.dataType})`);
  } else {
    console.log('❌ health_status column does NOT exist');
  }
  
  // Overall status
  console.log('\n📊 Migration 039 Status:');
  if (result.isComplete) {
    console.log('✅ Migration 039 is COMPLETE (verified via direct PostgreSQL connection)');
    console.log('   - sync_health table created');
    console.log('   - sync_logs table extended');
    console.log('   - Auto-sync health monitoring is ready');
    console.log('\n💡 Note: PostgREST cache may still be outdated.');
    console.log('   Consider restarting your Supabase project or waiting for cache refresh.');
  } else {
    console.log('❌ Migration 039 is INCOMPLETE');
    console.log('   - Manual intervention required');
    console.log('   - Please check the migration SQL and re-run if necessary');
  }
}

/**
 * Main verification function
 */
async function verifyMigrationDirect(): Promise<void> {
  let pool: Pool | null = null;
  
  try {
    console.log('🚀 Starting Migration 039 verification (Direct PostgreSQL)...\n');
    
    // 1. Create database connection
    pool = createDatabasePool();
    await testConnection(pool);
    
    // 2. Check sync_health table
    console.log('\n📋 Checking sync_health table...');
    const syncHealthExists = await checkTableExists(pool, 'sync_health');
    
    let syncHealthColumns: string[] | undefined;
    let syncHealthRecordCount: number | undefined;
    let syncHealthSample: any | undefined;
    
    if (syncHealthExists) {
      syncHealthColumns = await getTableColumns(pool, 'sync_health');
      syncHealthRecordCount = await getRecordCount(pool, 'sync_health');
      
      if (syncHealthRecordCount > 0) {
        syncHealthSample = await getSampleData(pool, 'sync_health');
      }
    }
    
    // 3. Check sync_logs columns
    console.log('\n📋 Checking sync_logs columns...');
    const syncLogsColumns = await checkSyncLogsColumns(pool);
    
    // 4. Aggregate results
    const result: VerificationResult = {
      syncHealthExists,
      syncHealthColumns,
      syncHealthRecordCount,
      syncHealthSample,
      syncLogsColumnsExist: syncLogsColumns,
      isComplete: 
        syncHealthExists &&
        syncLogsColumns.missing_sellers_detected.exists &&
        syncLogsColumns.triggered_by.exists &&
        syncLogsColumns.health_status.exists,
    };
    
    // 5. Generate report
    generateReport(result);
    
    // 6. Set exit code
    process.exit(result.isComplete ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    if (error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    // 7. Close connection
    if (pool) {
      await pool.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}

// Run verification
verifyMigrationDirect();
