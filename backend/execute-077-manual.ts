import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config();

async function executeMigration077() {
  console.log('=== マイグレーション077を手動実行 ===\n');

  try {
    // マイグレーションファイルを読み込む
    const migrationPath = path.join(__dirname, 'migrations', '077_add_hidden_images_to_property_listings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    console.log('マイグレーションSQL:');
    console.log(migrationSQL);
    console.log('\n実行中...\n');

    // SQLを個別のステートメントに分割して実行
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        console.log(`実行: ${statement.substring(0, 100)}...`);
        
        // Supabase REST APIではDDLを直接実行できないため、
        // SQL Editorで実行する必要があることを通知
        console.log('⚠️  このSQLはSupabase SQL Editorで実行する必要があります');
      }
    }

    console.log('\n=== 実行手順 ===');
    console.log('1. Supabaseダッシュボードにアクセス');
    console.log('2. SQL Editorを開く');
    console.log('3. 以下のSQLを貼り付けて実行:\n');
    console.log('```sql');
    console.log(migrationSQL);
    console.log('```\n');
    console.log('4. 実行後、以下のコマンドで確認:');
    console.log('   npx ts-node verify-hidden-images-column.ts');

  } catch (error) {
    console.error('エラー:', error);
  }
}

executeMigration077().then(() => {
  console.log('\n=== 完了 ===');
  process.exit(0);
}).catch(error => {
  console.error('実行エラー:', error);
  process.exit(1);
});
