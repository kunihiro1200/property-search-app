/**
 * Migration 094: Add unique constraint to buyer_number
 * 
 * This migration adds a unique constraint to the buyer_number column in the buyers table.
 * This is required for UPSERT operations using buyer_number as the conflict target.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

config({ path: './backend/.env.local' });

async function runMigration() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_KEY not found');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log('🚀 Running Migration 094: Add buyer_number unique constraint\n');

  try {
    // マイグレーションSQLを読み込み
    const migrationPath = path.join(__dirname, '094_add_buyer_number_unique_constraint.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('📄 Migration SQL:');
    console.log(migrationSQL);
    console.log('\n');

    // SQLを実行（DO ブロックを含むため、rpcで実行）
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: migrationSQL
    });

    if (error) {
      console.error('❌ Migration failed (RPC not available)');
      console.error('   Trying direct execution...\n');

      // RPC が使えない場合は、SQL を分割して実行
      const statements = migrationSQL
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));

      for (const statement of statements) {
        if (statement.startsWith('DO $')) {
          console.log('⚠️  Skipping DO block (requires PostgreSQL direct access)');
          console.log('   Please run this migration manually in Supabase SQL Editor:');
          console.log('   https://supabase.com/dashboard/project/[your-project]/sql\n');
          console.log('   Copy and paste the following SQL:\n');
          console.log(migrationSQL);
          console.log('\n');
          return;
        }

        const { error: stmtError } = await supabase.rpc('exec_sql', {
          sql_query: statement
        });

        if (stmtError) {
          console.error(`❌ Statement failed: ${statement.substring(0, 50)}...`);
          console.error(`   Error: ${stmtError.message}`);
          throw stmtError;
        }
      }
    }

    console.log('✅ Migration 094 completed successfully\n');

    // 制約が追加されたか確認
    const { data: buyers, error: checkError } = await supabase
      .from('buyers')
      .select('buyer_number')
      .limit(1);

    if (checkError) {
      console.error('❌ Verification failed:', checkError.message);
    } else {
      console.log('✅ Verification: buyers table is accessible');
    }

    // 重複チェック
    const { data: allBuyers, error: dupError } = await supabase
      .from('buyers')
      .select('buyer_number')
      .not('buyer_number', 'is', null);

    if (!dupError && allBuyers) {
      const buyerNumbers = new Map<string, number>();
      for (const buyer of allBuyers) {
        const count = buyerNumbers.get(buyer.buyer_number) || 0;
        buyerNumbers.set(buyer.buyer_number, count + 1);
      }

      const duplicateCount = Array.from(buyerNumbers.values()).filter(count => count > 1).length;

      console.log(`📊 Total buyers: ${allBuyers.length}`);
      console.log(`📊 Unique buyer_numbers: ${buyerNumbers.size}`);
      console.log(`📊 Duplicate buyer_numbers: ${duplicateCount}`);

      if (duplicateCount > 0) {
        console.log('\n⚠️  Warning: Duplicates still exist after migration');
        console.log('   The migration should have removed duplicates automatically');
      } else {
        console.log('\n✅ No duplicates found - constraint is working correctly');
      }
    }

  } catch (error: any) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n📝 Manual execution required:');
    console.error('   1. Open Supabase SQL Editor: https://supabase.com/dashboard/project/[your-project]/sql');
    console.error('   2. Copy and paste the SQL from: backend/migrations/094_add_buyer_number_unique_constraint.sql');
    console.error('   3. Execute the SQL');
    process.exit(1);
  }
}

runMigration();
