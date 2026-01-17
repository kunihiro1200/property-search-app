/**
 * Database Connection Diagnostic Script
 * 
 * このスクリプトはデータベース接続の問題を段階的に診断します。
 * Migration 081の検証前に実行してください。
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as dns from 'dns';
import * as net from 'net';

dotenv.config({ path: path.join(__dirname, '.env') });

async function diagnoseDatabaseConnection() {
  console.log('🔍 データベース接続診断を開始します...\n');

  // Step 1: Check environment variable
  console.log('📋 ステップ1: 環境変数の確認');
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL が設定されていません');
    console.log('\n解決方法:');
    console.log('1. backend/.env ファイルを開く');
    console.log('2. 以下の行を追加:');
    console.log('   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
    console.log('3. [YOUR-PASSWORD] を実際のパスワードに置き換える');
    console.log('\nパスワードの取得方法:');
    console.log('- Supabaseダッシュボード → Project Settings → Database → Connection string');
    console.log('- "URI" タブを選択');
    console.log('- パスワードを入力して完全な接続文字列を取得');
    return;
  }
  
  console.log('✅ DATABASE_URL が設定されています');
  console.log(`   ${databaseUrl.replace(/:[^:@]+@/, ':****@')}\n`);

  // Step 2: Parse connection string
  console.log('📋 ステップ2: 接続文字列の解析');
  let parsedUrl;
  try {
    parsedUrl = new URL(databaseUrl);
    console.log('✅ 接続文字列の形式が正しいです');
    console.log(`   ホスト: ${parsedUrl.hostname}`);
    console.log(`   ポート: ${parsedUrl.port}`);
    console.log(`   ユーザー: ${parsedUrl.username}`);
    console.log(`   データベース: ${parsedUrl.pathname.slice(1)}\n`);
  } catch (error: any) {
    console.error('❌ 接続文字列の形式が不正です');
    console.error(`   エラー: ${error.message}`);
    console.log('\n正しい形式:');
    console.log('postgresql://postgres:[PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
    console.log('\n特殊文字が含まれる場合はURLエンコードが必要です:');
    console.log('@ → %40, : → %3A, / → %2F, ? → %3F, # → %23');
    return;
  }

  // Step 3: DNS resolution
  console.log('📋 ステップ3: ホスト名の解決');
  try {
    const addresses = await dns.promises.resolve4(parsedUrl.hostname);
    console.log('✅ ホスト名が解決できました');
    console.log(`   IPアドレス: ${addresses.join(', ')}\n`);
  } catch (error: any) {
    console.error('❌ ホスト名が解決できません');
    console.error(`   エラー: ${error.message}`);
    console.log('\n解決方法:');
    console.log('- インターネット接続を確認');
    console.log('- DNSサーバーの設定を確認');
    console.log('- VPN接続を確認');
    return;
  }

  // Step 4: TCP connection
  console.log('📋 ステップ4: TCP接続のテスト');
  const tcpConnected = await new Promise<boolean>((resolve) => {
    const socket = net.createConnection({
      host: parsedUrl.hostname,
      port: parseInt(parsedUrl.port),
      timeout: 5000
    });

    socket.on('connect', () => {
      socket.end();
      resolve(true);
    });

    socket.on('error', () => {
      resolve(false);
    });

    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });

  if (!tcpConnected) {
    console.error('❌ TCP接続ができません');
    console.log('\n解決方法:');
    console.log('- ファイアウォールがポート5432をブロックしていないか確認');
    console.log('- プロキシ設定を確認');
    console.log('- Supabaseプロジェクトが実行中か確認');
    console.log('- 企業ネットワークの場合、IT部門に確認');
    return;
  }

  console.log('✅ TCP接続が成功しました\n');

  // Step 5: PostgreSQL connection
  console.log('📋 ステップ5: PostgreSQL接続のテスト');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ PostgreSQL接続が成功しました\n');

    // Step 6: Query test
    console.log('📋 ステップ6: クエリのテスト');
    const result = await client.query('SELECT version()');
    console.log('✅ クエリが成功しました');
    console.log(`   PostgreSQLバージョン: ${result.rows[0].version.split(',')[0]}\n`);

    // Step 7: Check tables
    console.log('📋 ステップ7: テーブルの確認');
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    console.log(`✅ ${tables.rows.length} 個のテーブルが見つかりました`);
    if (tables.rows.length > 0) {
      console.log('   主要テーブル:');
      tables.rows.slice(0, 10).forEach((row: any) => {
        console.log(`   - ${row.table_name}`);
      });
      if (tables.rows.length > 10) {
        console.log(`   ... 他 ${tables.rows.length - 10} 個`);
      }
    }
    console.log('');

    // Success!
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ 全ての診断に合格しました！');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n次のステップ:');
    console.log('1. Migration 081の検証を実行:');
    console.log('   npx ts-node migrations/verify-081-direct-pg.ts');
    console.log('');
    console.log('2. 検証が失敗した場合:');
    console.log('   npx ts-node migrations/run-081-migration.ts');
    console.log('');

  } catch (error: any) {
    console.error('❌ PostgreSQL接続に失敗しました');
    console.error(`   エラー: ${error.message}`);
    console.log('\n解決方法:');
    
    if (error.message.includes('password')) {
      console.log('【パスワードの問題】');
      console.log('1. Supabaseダッシュボードにアクセス');
      console.log('2. Project Settings → Database → Database password');
      console.log('3. "Reset database password" をクリック');
      console.log('4. 新しいパスワードをコピー');
      console.log('5. backend/.env の DATABASE_URL を更新');
      console.log('   postgresql://postgres:[NEW-PASSWORD]@db.fzcuexscuwhoywcicdqq.supabase.co:5432/postgres');
    } else if (error.message.includes('database')) {
      console.log('【データベースの問題】');
      console.log('1. データベース名が正しいか確認（通常は "postgres"）');
      console.log('2. Supabaseプロジェクトが実行中か確認');
      console.log('3. ダッシュボードで "Pause project" になっていないか確認');
    } else if (error.message.includes('user') || error.message.includes('role')) {
      console.log('【ユーザー名の問題】');
      console.log('1. ユーザー名が正しいか確認（通常は "postgres"）');
      console.log('2. Supabaseダッシュボードで接続文字列を再確認');
    } else if (error.message.includes('timeout')) {
      console.log('【タイムアウトの問題】');
      console.log('1. ネットワーク接続が安定しているか確認');
      console.log('2. VPN接続を確認');
      console.log('3. Supabaseのステータスページを確認: https://status.supabase.com');
    } else {
      console.log('【一般的な解決方法】');
      console.log('1. Supabaseダッシュボードで接続文字列を再確認');
      console.log('2. プロジェクトが一時停止していないか確認');
      console.log('3. 接続制限に達していないか確認');
      console.log('4. Supabaseサポートに問い合わせ');
    }

    console.log('\n詳細なエラー情報:');
    console.log(error);

  } finally {
    await client.end();
  }
}

diagnoseDatabaseConnection().catch((error) => {
  console.error('\n予期しないエラーが発生しました:');
  console.error(error);
  process.exit(1);
});
