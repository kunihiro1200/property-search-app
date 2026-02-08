import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function check() {
  console.log('=== google_calendar_tokensテーブルの確認 ===\n');
  
  try {
    // テーブルの存在確認
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'google_calendar_tokens'
      );
    `);
    
    console.log('テーブル存在:', tableCheck.rows[0].exists ? '✅ 存在する' : '❌ 存在しない');
    
    if (tableCheck.rows[0].exists) {
      // テーブル構造を確認
      const structure = await pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
        AND table_name = 'google_calendar_tokens'
        ORDER BY ordinal_position;
      `);
      
      console.log('\nテーブル構造:');
      structure.rows.forEach(col => {
        console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL可' : 'NOT NULL'})`);
      });
      
      // データ件数を確認
      const count = await pool.query('SELECT COUNT(*) FROM google_calendar_tokens');
      console.log('\nデータ件数:', count.rows[0].count);
      
      // 全データを確認
      if (parseInt(count.rows[0].count) > 0) {
        const data = await pool.query(`
          SELECT 
            gct.id,
            gct.employee_id,
            e.name as employee_name,
            e.initials,
            e.email,
            gct.created_at,
            gct.updated_at
          FROM google_calendar_tokens gct
          LEFT JOIN employees e ON gct.employee_id = e.id
        `);
        
        console.log('\n登録済みトークン:');
        data.rows.forEach(row => {
          console.log(`  - ${row.employee_name} (${row.initials}) - ${row.email}`);
          console.log(`    作成日: ${row.created_at}`);
          console.log(`    更新日: ${row.updated_at}`);
        });
      }
    }
  } catch (error) {
    console.error('エラー:', error);
  } finally {
    await pool.end();
  }
}

check();
