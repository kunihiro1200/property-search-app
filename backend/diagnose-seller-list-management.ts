import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// 環境変数を読み込む
dotenv.config({ path: path.join(__dirname, '.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ エラー: SUPABASE_URLまたはSUPABASE_SERVICE_ROLE_KEYが設定されていません');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface DiagnosticResult {
  category: string;
  item: string;
  status: 'OK' | 'WARNING' | 'ERROR' | 'INFO';
  message: string;
  details?: any;
}

const results: DiagnosticResult[] = [];

function addResult(category: string, item: string, status: DiagnosticResult['status'], message: string, details?: any) {
  results.push({ category, item, status, message, details });
}

async function checkDatabaseTables() {
  console.log('\n📊 データベーステーブルの確認...');
  
  const tables = [
    'sellers',
    'seller_number_sequence',
    'seller_history',
    'properties',
    'valuations',
    'activity_logs',
    'follow_ups',
    'appointments',
    'employees'
  ];
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        if (error.message.includes('does not exist')) {
          addResult('データベース', `${table}テーブル`, 'WARNING', 'テーブルが存在しません');
        } else {
          addResult('データベース', `${table}テーブル`, 'ERROR', `エラー: ${error.message}`);
        }
      } else {
        addResult('データベース', `${table}テーブル`, 'OK', 'テーブルが存在します');
      }
    } catch (err: any) {
      addResult('データベース', `${table}テーブル`, 'ERROR', `例外: ${err.message}`);
    }
  }
}

async function checkSellerNumberSequence() {
  console.log('\n🔢 売主番号シーケンスの確認...');
  
  try {
    const { data, error } = await supabase
      .from('seller_number_sequence')
      .select('*')
      .single();
    
    if (error) {
      addResult('売主番号', 'シーケンス', 'ERROR', `エラー: ${error.message}`);
    } else if (data) {
      addResult('売主番号', 'シーケンス', 'OK', `現在の番号: ${data.current_number}`, data);
    } else {
      addResult('売主番号', 'シーケンス', 'WARNING', 'シーケンスが初期化されていません');
    }
  } catch (err: any) {
    addResult('売主番号', 'シーケンス', 'ERROR', `例外: ${err.message}`);
  }
}

async function checkSellers() {
  console.log('\n👥 売主データの確認...');
  
  try {
    const { count, error } = await supabase
      .from('sellers')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      addResult('売主データ', '件数', 'ERROR', `エラー: ${error.message}`);
    } else {
      addResult('売主データ', '件数', 'INFO', `${count || 0}件の売主が登録されています`);
      
      if (count && count > 0) {
        // 最新の売主を取得
        const { data: latestSeller, error: latestError } = await supabase
          .from('sellers')
          .select('seller_number, name, created_at')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (!latestError && latestSeller) {
          addResult('売主データ', '最新売主', 'INFO', `売主番号: ${latestSeller.seller_number}`, latestSeller);
        }
      }
    }
  } catch (err: any) {
    addResult('売主データ', '件数', 'ERROR', `例外: ${err.message}`);
  }
}

async function checkIndexes() {
  console.log('\n📇 インデックスの確認...');
  
  try {
    const { data, error } = await supabase.rpc('pg_indexes', {
      schemaname: 'public',
      tablename: 'sellers'
    });
    
    if (error) {
      addResult('インデックス', 'sellers', 'WARNING', 'インデックス情報を取得できません');
    } else if (data) {
      addResult('インデックス', 'sellers', 'INFO', `${data.length}個のインデックスが存在します`);
    }
  } catch (err: any) {
    addResult('インデックス', 'sellers', 'WARNING', 'インデックス確認をスキップしました');
  }
}

async function checkEnvironmentVariables() {
  console.log('\n🔐 環境変数の確認...');
  
  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'ENCRYPTION_KEY',
    'JWT_SECRET'
  ];
  
  for (const varName of requiredVars) {
    if (process.env[varName]) {
      addResult('環境変数', varName, 'OK', '設定されています');
    } else {
      addResult('環境変数', varName, 'WARNING', '設定されていません');
    }
  }
}

async function checkServices() {
  console.log('\n⚙️ サービスファイルの確認...');
  
  const services = [
    'SellerService',
    'SellerNumberService',
    'DuplicateDetectionService',
    'ValuationEngine',
    'ActivityLogService'
  ];
  
  const fs = require('fs');
  
  for (const service of services) {
    const filePath = path.join(__dirname, 'src', 'services', `${service}.ts`);
    if (fs.existsSync(filePath)) {
      addResult('サービス', service, 'OK', 'ファイルが存在します');
    } else {
      addResult('サービス', service, 'WARNING', 'ファイルが存在しません');
    }
  }
}

function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 診断結果サマリー');
  console.log('='.repeat(80));
  
  const categories = [...new Set(results.map(r => r.category))];
  
  for (const category of categories) {
    console.log(`\n【${category}】`);
    const categoryResults = results.filter(r => r.category === category);
    
    for (const result of categoryResults) {
      const icon = result.status === 'OK' ? '✅' : 
                   result.status === 'WARNING' ? '⚠️' : 
                   result.status === 'ERROR' ? '❌' : 'ℹ️';
      
      console.log(`  ${icon} ${result.item}: ${result.message}`);
      
      if (result.details) {
        console.log(`     詳細: ${JSON.stringify(result.details, null, 2)}`);
      }
    }
  }
  
  // 統計情報
  const okCount = results.filter(r => r.status === 'OK').length;
  const warningCount = results.filter(r => r.status === 'WARNING').length;
  const errorCount = results.filter(r => r.status === 'ERROR').length;
  const infoCount = results.filter(r => r.status === 'INFO').length;
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 統計情報');
  console.log('='.repeat(80));
  console.log(`  ✅ OK: ${okCount}`);
  console.log(`  ⚠️  WARNING: ${warningCount}`);
  console.log(`  ❌ ERROR: ${errorCount}`);
  console.log(`  ℹ️  INFO: ${infoCount}`);
  console.log(`  📝 合計: ${results.length}`);
  
  // 推奨事項
  console.log('\n' + '='.repeat(80));
  console.log('💡 推奨事項');
  console.log('='.repeat(80));
  
  if (errorCount > 0) {
    console.log('  ❌ エラーが検出されました。以下を確認してください:');
    results.filter(r => r.status === 'ERROR').forEach(r => {
      console.log(`     - ${r.category} > ${r.item}: ${r.message}`);
    });
  }
  
  if (warningCount > 0) {
    console.log('  ⚠️  警告が検出されました。以下を確認してください:');
    results.filter(r => r.status === 'WARNING').forEach(r => {
      console.log(`     - ${r.category} > ${r.item}: ${r.message}`);
    });
  }
  
  if (errorCount === 0 && warningCount === 0) {
    console.log('  ✅ すべての確認項目が正常です！');
  }
  
  console.log('\n' + '='.repeat(80));
}

async function main() {
  console.log('🔍 売主リスト管理システム 診断ツール');
  console.log('='.repeat(80));
  
  try {
    await checkEnvironmentVariables();
    await checkDatabaseTables();
    await checkSellerNumberSequence();
    await checkSellers();
    await checkIndexes();
    await checkServices();
    
    printResults();
    
    // 終了コード
    const errorCount = results.filter(r => r.status === 'ERROR').length;
    process.exit(errorCount > 0 ? 1 : 0);
    
  } catch (error: any) {
    console.error('\n❌ 診断中にエラーが発生しました:', error.message);
    process.exit(1);
  }
}

main();
