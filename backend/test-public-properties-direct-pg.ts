// 直接PostgreSQL接続でpublic propertiesをテスト
import * as dotenv from 'dotenv';
dotenv.config();

import { Pool } from 'pg';

async function testDirectPgConnection() {
  console.log('=== 直接PostgreSQL接続テスト ===\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // 1. site_displayカラムの存在確認
    console.log('1. site_displayカラムの確認...');
    const columnCheck = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'property_listings' 
      AND column_name = 'site_display'
    `);
    
    if (columnCheck.rows.length > 0) {
      console.log('   ✓ site_displayカラムが存在します');
      console.log(`   データ型: ${columnCheck.rows[0].data_type}`);
    } else {
      console.log('   ✗ site_displayカラムが存在しません！');
      return;
    }

    // 2. site_displayの値を確認
    console.log('\n2. site_displayの値を確認...');
    const valuesCheck = await pool.query(`
      SELECT site_display, COUNT(*) as count 
      FROM property_listings 
      GROUP BY site_display
    `);
    console.log('   site_displayの値分布:');
    valuesCheck.rows.forEach(row => {
      console.log(`   - "${row.site_display || 'NULL'}": ${row.count}件`);
    });

    // 3. サイト表示の物件を取得
    console.log('\n3. サイト表示の物件を取得...');
    const publicProperties = await pool.query(`
      SELECT 
        id,
        property_number,
        property_type,
        address,
        price,
        site_display,
        created_at
      FROM property_listings
      WHERE site_display = 'サイト表示'
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log(`   サイト表示の物件数: ${publicProperties.rows.length}件`);
    if (publicProperties.rows.length > 0) {
      console.log('\n   最新5件:');
      publicProperties.rows.forEach((row, idx) => {
        console.log(`   ${idx + 1}. ${row.property_number} - ${row.address?.substring(0, 30)}...`);
      });
    }

    // 4. 全物件数を確認
    console.log('\n4. 全物件数を確認...');
    const totalCount = await pool.query(`SELECT COUNT(*) as total FROM property_listings`);
    console.log(`   全物件数: ${totalCount.rows[0].total}件`);

    console.log('\n=== テスト完了 ===');
    console.log('\n直接PostgreSQL接続は正常に動作しています。');
    console.log('バックエンドを再起動して、/api/public/properties エンドポイントをテストしてください。');

  } catch (error: any) {
    console.error('エラー:', error.message);
  } finally {
    await pool.end();
  }
}

testDirectPgConnection();
