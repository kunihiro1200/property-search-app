import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkMigrationStatus() {
  console.log('🔍 マイグレーション実行状態を確認中...\n');

  // migrationsテーブルを確認
  const { data: migrations, error } = await supabase
    .from('migrations')
    .select('*')
    .order('version', { ascending: true });

  if (error) {
    console.error('❌ エラー:', error);
    console.log('\n⚠️  migrationsテーブルが存在しない可能性があります');
    return;
  }

  if (!migrations || migrations.length === 0) {
    console.log('⚠️  実行されたマイグレーションが見つかりません');
    return;
  }

  console.log(`📊 実行済みマイグレーション (${migrations.length}件):\n`);

  migrations.forEach((migration) => {
    console.log(`✅ ${migration.version} - ${new Date(migration.executed_at).toLocaleString('ja-JP')}`);
  });

  // 007と009が実行されているか確認
  const migration007 = migrations.find(m => m.version === '007');
  const migration009 = migrations.find(m => m.version === '009');

  console.log('\n🎯 重要なマイグレーション:');
  console.log(`   007 (inquiry_year追加): ${migration007 ? '✅ 実行済み' : '❌ 未実行'}`);
  console.log(`   009 (inquiry_site追加): ${migration009 ? '✅ 実行済み' : '❌ 未実行'}`);

  if (!migration007 || !migration009) {
    console.log('\n⚠️  必要なマイグレーションが実行されていません！');
    console.log('   マイグレーションを実行する必要があります。');
  }
}

checkMigrationStatus()
  .then(() => {
    console.log('\n✅ 確認完了');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ エラー:', error);
    process.exit(1);
  });
