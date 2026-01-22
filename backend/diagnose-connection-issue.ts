/**
 * Migration 039 接続診断スクリプト
 * 
 * このスクリプトは以下を診断します：
 * 1. DNS解決（ホスト名がIPアドレスに変換できるか）
 * 2. ネットワーク接続（データベースサーバーに到達できるか）
 * 3. データベース認証（パスワードが正しいか）
 */

import { config } from 'dotenv';
import { Client } from 'pg';
import * as dns from 'dns';
import { promisify } from 'util';

// .envファイルを読み込む
config();

const lookup = promisify(dns.lookup);

// 接続情報を解析
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL が .env ファイルに設定されていません');
  process.exit(1);
}

// URLから接続情報を抽出
const urlMatch = DATABASE_URL.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/);

if (!urlMatch) {
  console.error('❌ DATABASE_URL の形式が正しくありません');
  console.error('   期待される形式: postgresql://user:password@host:port/database');
  process.exit(1);
}

const [, user, password, host, port, database] = urlMatch;

console.log('🔍 Migration 039 接続診断を開始します...\n');

console.log('📋 接続情報:');
console.log(`   ユーザー: ${user}`);
console.log(`   ホスト: ${host}`);
console.log(`   ポート: ${port}`);
console.log(`   データベース: ${database}`);
console.log(`   パスワード: ${'*'.repeat(password.length)} (${password.length}文字)\n`);

async function diagnoseDNS() {
  console.log('🔍 ステップ1: DNS解決テスト');
  console.log(`   ホスト名: ${host}`);
  
  try {
    const result = await lookup(host);
    console.log(`✅ DNS解決成功`);
    console.log(`   IPアドレス: ${result.address}`);
    console.log(`   アドレスファミリー: IPv${result.family}\n`);
    return true;
  } catch (error: any) {
    console.error(`❌ DNS解決失敗`);
    console.error(`   エラー: ${error.message}`);
    console.error(`   エラーコード: ${error.code}\n`);
    
    console.log('💡 考えられる原因:');
    console.log('   1. Supabaseプロジェクトが一時停止している（最も可能性が高い）');
    console.log('   2. インターネット接続に問題がある');
    console.log('   3. DNSサーバーに問題がある\n');
    
    console.log('🔧 解決方法:');
    console.log('   1. Supabaseダッシュボードを開く: https://supabase.com/dashboard');
    console.log('   2. プロジェクトのステータスを確認');
    console.log('   3. "Paused"（一時停止）の場合は "Resume"（再開）をクリック');
    console.log('   4. プロジェクトが再開するまで数分待つ');
    console.log('   5. このスクリプトを再実行\n');
    
    return false;
  }
}

async function diagnoseConnection() {
  console.log('🔍 ステップ2: ネットワーク接続テスト');
  console.log(`   接続先: ${host}:${port}`);
  
  const client = new Client({
    host,
    port: parseInt(port),
    user,
    password,
    database,
    connectionTimeoutMillis: 10000, // 10秒でタイムアウト
  });
  
  try {
    await client.connect();
    console.log(`✅ ネットワーク接続成功\n`);
    await client.end();
    return true;
  } catch (error: any) {
    console.error(`❌ ネットワーク接続失敗`);
    console.error(`   エラー: ${error.message}`);
    console.error(`   エラーコード: ${error.code}\n`);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 考えられる原因:');
      console.log('   1. データベースサーバーが起動していない');
      console.log('   2. ファイアウォールがポート5432をブロックしている\n');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 考えられる原因:');
      console.log('   1. ネットワーク接続が遅い');
      console.log('   2. ファイアウォールがブロックしている');
      console.log('   3. VPN接続に問題がある\n');
    }
    
    return false;
  }
}

async function diagnoseAuthentication() {
  console.log('🔍 ステップ3: データベース認証テスト');
  
  const client = new Client({
    connectionString: DATABASE_URL,
    connectionTimeoutMillis: 10000,
  });
  
  try {
    await client.connect();
    console.log(`✅ データベース認証成功`);
    
    // サーバー時刻を取得
    const result = await client.query('SELECT NOW() as server_time');
    console.log(`   サーバー時刻: ${result.rows[0].server_time}\n`);
    
    await client.end();
    return true;
  } catch (error: any) {
    console.error(`❌ データベース認証失敗`);
    console.error(`   エラー: ${error.message}`);
    console.error(`   エラーコード: ${error.code}\n`);
    
    if (error.code === '28P01') {
      console.log('💡 原因: パスワードが間違っています\n');
      console.log('🔧 解決方法:');
      console.log('   1. Supabaseダッシュボードを開く: https://supabase.com/dashboard');
      console.log('   2. Settings → Database');
      console.log('   3. "Reset Database Password" をクリック');
      console.log('   4. 新しいパスワードをコピー');
      console.log('   5. backend/.env ファイルの DATABASE_URL を更新');
      console.log('   6. このスクリプトを再実行\n');
    }
    
    return false;
  }
}

async function main() {
  try {
    // ステップ1: DNS解決
    const dnsOk = await diagnoseDNS();
    if (!dnsOk) {
      console.log('⚠️  DNS解決に失敗したため、以降のテストをスキップします');
      console.log('   まずSupabaseプロジェクトのステータスを確認してください\n');
      process.exit(1);
    }
    
    // ステップ2: ネットワーク接続
    const connectionOk = await diagnoseConnection();
    if (!connectionOk) {
      console.log('⚠️  ネットワーク接続に失敗したため、認証テストをスキップします\n');
      process.exit(1);
    }
    
    // ステップ3: データベース認証
    const authOk = await diagnoseAuthentication();
    if (!authOk) {
      console.log('⚠️  データベース認証に失敗しました\n');
      process.exit(1);
    }
    
    // すべて成功
    console.log('✅ すべての診断テストに合格しました！');
    console.log('   データベース接続は正常です\n');
    
    console.log('📋 次のステップ:');
    console.log('   Migration 039の検証スクリプトを実行してください:');
    console.log('   npx ts-node verify-migration-039-direct.ts\n');
    
  } catch (error: any) {
    console.error('❌ 予期しないエラーが発生しました:');
    console.error(`   ${error.message}\n`);
    process.exit(1);
  }
}

main();
