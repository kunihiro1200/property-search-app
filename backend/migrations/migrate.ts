import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationRecord {
  id: number;
  name: string;
  executed_at: string;
}

/**
 * Create migrations table if it doesn't exist
 */
async function createMigrationsTable(): Promise<void> {
  console.log('📋 Checking migrations table...');
  
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }

  console.log('✅ Migrations table ready');
}

/**
 * Get list of executed migrations
 */
async function getExecutedMigrations(): Promise<string[]> {
  const { data, error } = await supabase
    .from('migrations')
    .select('name')
    .order('id', { ascending: true });

  if (error) {
    console.error('❌ Failed to get executed migrations:', error);
    throw error;
  }

  return (data || []).map((m: MigrationRecord) => m.name);
}

/**
 * Record migration execution
 */
async function recordMigration(name: string): Promise<void> {
  const { error } = await supabase
    .from('migrations')
    .insert({ name });

  if (error) {
    console.error(`❌ Failed to record migration ${name}:`, error);
    throw error;
  }
}

/**
 * Execute SQL migration file
 */
async function executeMigration(filePath: string, name: string): Promise<void> {
  console.log(`\n🔄 Executing migration: ${name}`);
  
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  // Split by semicolons but preserve function definitions
  const statements = sql
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|COMMENT|GRANT|--|\n\n))/gi)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    console.log(`   Executing statement ${i + 1}/${statements.length}...`);
    
    const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

    if (error) {
      console.error(`❌ Failed to execute statement ${i + 1}:`, error);
      console.error('Statement:', statement.substring(0, 200) + '...');
      throw error;
    }
  }

  await recordMigration(name);
  console.log(`✅ Migration ${name} completed successfully`);
}

/**
 * Run all pending migrations
 */
async function runMigrations(): Promise<void> {
  console.log('🚀 Starting migration process...\n');

  // Create migrations table if needed
  await createMigrationsTable();

  // Get executed migrations
  const executedMigrations = await getExecutedMigrations();
  console.log(`📊 Found ${executedMigrations.length} executed migrations`);

  // Get all migration files
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
    .sort();

  console.log(`📁 Found ${files.length} migration files\n`);

  // Execute pending migrations
  let executedCount = 0;
  for (const file of files) {
    const name = file.replace('.sql', '');
    
    if (executedMigrations.includes(name)) {
      console.log(`⏭️  Skipping ${name} (already executed)`);
      continue;
    }

    const filePath = path.join(migrationsDir, file);
    await executeMigration(filePath, name);
    executedCount++;
  }

  console.log(`\n✨ Migration process completed!`);
  console.log(`   Executed: ${executedCount} new migrations`);
  console.log(`   Skipped: ${files.length - executedCount} existing migrations`);
}

/**
 * Main execution
 */
async function main() {
  try {
    await runMigrations();
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  }
}

main();
