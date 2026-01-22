import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

async function checkWorkTables() {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );

  try {
    console.log('Checking for tables with "work" in name...\n');
    
    // PostgreSQLの情報スキーマから直接クエリ
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE '%work%'
          ORDER BY table_name;
        `
      });
    
    if (error) {
      console.log('RPC method not available, trying direct query...');
      
      // 代替方法：既知のテーブル名を試す
      const tablesToTry = ['work_tasks', 'work_task', 'tasks', 'gyomu_tasks'];
      
      for (const tableName of tablesToTry) {
        const { data: testData, error: testError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!testError) {
          console.log(`✅ Found table: ${tableName}`);
        } else if (testError.message.includes('does not exist')) {
          console.log(`❌ Table does not exist: ${tableName}`);
        } else {
          console.log(`⚠️  ${tableName}: ${testError.message}`);
        }
      }
    } else {
      console.log('Tables found:', data);
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

checkWorkTables();
