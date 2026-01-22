import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from backend directory
dotenv.config({ path: path.join(__dirname, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL environment variable is not set');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: {
    rejectUnauthorized: false
  }
});

async function diagnoseHiddenImagesIssue() {
  const client = await pool.connect();
  
  try {
    console.log('=== Hidden Images Column Diagnostic (Direct PostgreSQL) ===\n');

    // 1. テーブルの存在確認
    console.log('1. Checking if property_listings table exists...');
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'property_listings'
      ) as exists;
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ property_listings table exists');
    } else {
      console.error('❌ property_listings table does NOT exist!');
      return;
    }

    // 2. カラムの存在確認
    console.log('\n2. Checking if hidden_images column exists...');
    const columnCheck = await client.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `);

    if (columnCheck.rows.length === 0) {
      console.error('❌ hidden_images column does NOT exist!');
      console.log('\n🔍 ROOT CAUSE IDENTIFIED: The column was never successfully created.');
    } else {
      console.log('✅ hidden_images column exists:');
      console.log(JSON.stringify(columnCheck.rows[0], null, 2));
    }

    // 3. すべてのカラムをリスト表示
    console.log('\n3. All columns in property_listings table:');
    const allColumns = await client.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_listings'
      ORDER BY ordinal_position;
    `);

    allColumns.rows.forEach((col: any) => {
      const length = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  - ${col.column_name}: ${col.data_type}${length}`);
    });

    // 4. インデックスの確認
    console.log('\n4. Checking for hidden_images index...');
    const indexCheck = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'property_listings'
      AND indexname LIKE '%hidden_images%';
    `);

    if (indexCheck.rows.length === 0) {
      console.log('❌ No hidden_images index found');
    } else {
      console.log('✅ Index found:');
      indexCheck.rows.forEach((idx: any) => {
        console.log(`  - ${idx.indexname}`);
        console.log(`    ${idx.indexdef}`);
      });
    }

    // 5. カラムが存在しない場合、今すぐ追加を試みる
    if (columnCheck.rows.length === 0) {
      console.log('\n5. Attempting to add hidden_images column NOW...');
      
      try {
        await client.query('BEGIN');
        
        // カラムを追加
        await client.query(`
          ALTER TABLE property_listings 
          ADD COLUMN hidden_images TEXT[] DEFAULT '{}';
        `);
        console.log('  ✅ Column added');

        // コメントを追加
        await client.query(`
          COMMENT ON COLUMN property_listings.hidden_images 
          IS '非表示にした画像のファイルIDリスト';
        `);
        console.log('  ✅ Comment added');

        // インデックスを追加
        await client.query(`
          CREATE INDEX idx_property_listings_hidden_images 
          ON property_listings USING GIN (hidden_images);
        `);
        console.log('  ✅ Index created');

        await client.query('COMMIT');
        console.log('\n🎉 SUCCESS! hidden_images column has been added!');
        
        // PostgRESTキャッシュをリロード
        console.log('\n6. Notifying PostgREST to reload schema cache...');
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log('  ✅ Notification sent');
        
        console.log('\n⏳ Please wait 30-60 seconds for PostgREST to reload the schema cache.');
        
      } catch (error: any) {
        await client.query('ROLLBACK');
        console.error('\n❌ Failed to add column:', error.message);
        console.error('Error details:', error);
      }
    } else {
      console.log('\n5. Column already exists - no action needed');
    }

    // 6. 最終確認
    console.log('\n7. Final verification...');
    const finalCheck = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'property_listings'
      AND column_name = 'hidden_images';
    `);

    if (finalCheck.rows.length > 0) {
      console.log('✅ CONFIRMED: hidden_images column exists');
    } else {
      console.log('❌ FAILED: hidden_images column still does not exist');
    }

  } catch (error) {
    console.error('Unexpected error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

diagnoseHiddenImagesIssue()
  .then(() => {
    console.log('\n=== Diagnostic Complete ===');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
