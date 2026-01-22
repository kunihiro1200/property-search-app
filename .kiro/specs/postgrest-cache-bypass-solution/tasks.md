# PostgREST Schema Cache Bypass Solution - タスク一覧

## Phase 1: 環境準備とセットアップ

### Task 1.1: 依存関係のインストール
**優先度:** 高  
**見積もり:** 5分

**説明:**
`pg` パッケージをインストールして、PostgreSQL直接接続を可能にする。

**実装内容:**
```bash
cd backend
npm install pg @types/pg
```

**受け入れ基準:**
- [ ] `pg` パッケージがインストールされている
- [ ] `@types/pg` パッケージがインストールされている
- [ ] `package.json` に依存関係が追加されている

---

### Task 1.2: 環境変数の確認
**優先度:** 高  
**見積もり:** 5分

**説明:**
`.env` ファイルに `DATABASE_URL` が正しく設定されているか確認する。

**実装内容:**
- `.env` ファイルを開く
- `DATABASE_URL` の値を確認
- 形式が正しいか検証（`postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres`）

**受け入れ基準:**
- [ ] `DATABASE_URL` が設定されている
- [ ] 接続文字列の形式が正しい
- [ ] パスワードとプロジェクトIDが正しい

---

## Phase 2: 検証スクリプトの実装

### Task 2.1: 基本構造の作成
**優先度:** 高  
**見積もり:** 15分

**説明:**
`verify-migration-039-direct.ts` の基本構造を作成する。

**実装内容:**
```typescript
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

interface VerificationResult {
  syncHealthExists: boolean;
  syncHealthColumns?: string[];
  syncHealthSample?: any;
  syncLogsColumnsExist: {
    missing_sellers_detected: boolean;
    triggered_by: boolean;
    health_status: boolean;
  };
  isComplete: boolean;
}

async function verifyMigrationDirect(): Promise<void> {
  // 実装予定
}

verifyMigrationDirect();
```

**受け入れ基準:**
- [ ] ファイルが作成されている
- [ ] 必要なインポートが含まれている
- [ ] 型定義が正しい
- [ ] メイン関数が定義されている

---

### Task 2.2: データベース接続の実装
**優先度:** 高  
**見積もり:** 20分

**説明:**
PostgreSQLへの直接接続を確立する関数を実装する。

**実装内容:**
```typescript
function createDatabasePool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('   Please add DATABASE_URL to your .env file');
    console.error('   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
    process.exit(1);
  }
  
  return new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    max: 1,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,
  });
}

async function testConnection(pool: Pool): Promise<void> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log(`   Server time: ${result.rows[0].now}`);
  } catch (error: any) {
    console.error('❌ Database connection failed:', error.message);
    throw error;
  }
}
```

**受け入れ基準:**
- [ ] 環境変数からDATABASE_URLを取得できる
- [ ] 環境変数が未設定の場合にエラーメッセージを表示する
- [ ] PostgreSQLに接続できる
- [ ] SSL接続が有効になっている
- [ ] 接続テストが成功する

---

### Task 2.3: テーブル存在確認の実装
**優先度:** 高  
**見積もり:** 20分

**説明:**
`sync_health` テーブルの存在を確認する関数を実装する。

**実装内容:**
```typescript
async function checkTableExists(
  pool: Pool, 
  tableName: string
): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
    )
  `;
  
  try {
    const result = await pool.query(query, [tableName]);
    return result.rows[0].exists;
  } catch (error: any) {
    console.error(`❌ Failed to check table ${tableName}:`, error.message);
    throw error;
  }
}

async function getTableColumns(
  pool: Pool,
  tableName: string
): Promise<string[]> {
  const query = `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
  `;
  
  try {
    const result = await pool.query(query, [tableName]);
    return result.rows.map(row => row.column_name);
  } catch (error: any) {
    console.error(`❌ Failed to get columns for ${tableName}:`, error.message);
    throw error;
  }
}
```

**受け入れ基準:**
- [ ] テーブルの存在を確認できる
- [ ] テーブルのカラム一覧を取得できる
- [ ] エラーハンドリングが適切に実装されている
- [ ] パラメータ化クエリを使用している

---

### Task 2.4: カラム存在確認の実装
**優先度:** 高  
**見積もり:** 25分

**説明:**
`sync_logs` テーブルの新しいカラムの存在を確認する関数を実装する。

**実装内容:**
```typescript
interface ColumnInfo {
  exists: boolean;
  dataType?: string;
  isNullable?: boolean;
}

async function checkColumnExists(
  pool: Pool,
  tableName: string,
  columnName: string
): Promise<ColumnInfo> {
  const query = `
    SELECT 
      column_name,
      data_type,
      is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
  `;
  
  try {
    const result = await pool.query(query, [tableName, columnName]);
    
    if (result.rows.length === 0) {
      return { exists: false };
    }
    
    const row = result.rows[0];
    return {
      exists: true,
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
    };
  } catch (error: any) {
    console.error(`❌ Failed to check column ${tableName}.${columnName}:`, error.message);
    throw error;
  }
}

async function checkSyncLogsColumns(pool: Pool): Promise<{
  missing_sellers_detected: ColumnInfo;
  triggered_by: ColumnInfo;
  health_status: ColumnInfo;
}> {
  const [missingSellers, triggeredBy, healthStatus] = await Promise.all([
    checkColumnExists(pool, 'sync_logs', 'missing_sellers_detected'),
    checkColumnExists(pool, 'sync_logs', 'triggered_by'),
    checkColumnExists(pool, 'sync_logs', 'health_status'),
  ]);
  
  return {
    missing_sellers_detected: missingSellers,
    triggered_by: triggeredBy,
    health_status: healthStatus,
  };
}
```

**受け入れ基準:**
- [ ] カラムの存在を確認できる
- [ ] カラムのデータ型を取得できる
- [ ] カラムのNULL許可を取得できる
- [ ] 複数のカラムを並列で確認できる
- [ ] エラーハンドリングが適切に実装されている

---

### Task 2.5: サンプルデータ取得の実装
**優先度:** 中  
**見積もり:** 15分

**説明:**
`sync_health` テーブルからサンプルデータを取得する関数を実装する。

**実装内容:**
```typescript
async function getSampleData(
  pool: Pool,
  tableName: string
): Promise<any | null> {
  const query = `SELECT * FROM ${tableName} LIMIT 1`;
  
  try {
    const result = await pool.query(query);
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error: any) {
    console.error(`❌ Failed to get sample data from ${tableName}:`, error.message);
    return null;
  }
}

async function getRecordCount(
  pool: Pool,
  tableName: string
): Promise<number> {
  const query = `SELECT COUNT(*) as count FROM ${tableName}`;
  
  try {
    const result = await pool.query(query);
    return parseInt(result.rows[0].count, 10);
  } catch (error: any) {
    console.error(`❌ Failed to count records in ${tableName}:`, error.message);
    return 0;
  }
}
```

**受け入れ基準:**
- [ ] サンプルデータを取得できる
- [ ] レコード数を取得できる
- [ ] データが存在しない場合はnullを返す
- [ ] エラーハンドリングが適切に実装されている

---

### Task 2.6: レポート生成の実装
**優先度:** 高  
**見積もり:** 30分

**説明:**
検証結果を見やすい形式で表示する関数を実装する。

**実装内容:**
```typescript
function generateReport(result: VerificationResult): void {
  console.log('\n🔍 Verifying Migration 039 (Direct PostgreSQL Connection)...\n');
  
  // sync_health テーブル
  console.log('1. Checking sync_health table...');
  if (result.syncHealthExists) {
    console.log('✅ sync_health table exists');
    if (result.syncHealthColumns) {
      console.log(`   Columns: ${result.syncHealthColumns.join(', ')}`);
    }
    if (result.syncHealthSample) {
      console.log('   Sample record:');
      console.log('   ', JSON.stringify(result.syncHealthSample, null, 2).replace(/\n/g, '\n   '));
    }
  } else {
    console.log('❌ sync_health table does NOT exist');
  }
  
  // sync_logs カラム
  console.log('\n2. Checking sync_logs table extensions...');
  const columns = result.syncLogsColumnsExist;
  
  if (columns.missing_sellers_detected) {
    console.log('✅ missing_sellers_detected column exists');
  } else {
    console.log('❌ missing_sellers_detected column does NOT exist');
  }
  
  if (columns.triggered_by) {
    console.log('✅ triggered_by column exists');
  } else {
    console.log('❌ triggered_by column does NOT exist');
  }
  
  if (columns.health_status) {
    console.log('✅ health_status column exists');
  } else {
    console.log('❌ health_status column does NOT exist');
  }
  
  // 総合ステータス
  console.log('\n📊 Migration 039 Status:');
  if (result.isComplete) {
    console.log('✅ Migration 039 is COMPLETE (verified via direct PostgreSQL connection)');
    console.log('   - sync_health table created');
    console.log('   - sync_logs table extended');
    console.log('   - Auto-sync health monitoring is ready');
    console.log('\n💡 Note: PostgREST cache may still be outdated.');
    console.log('   Consider restarting your Supabase project or waiting for cache refresh.');
  } else {
    console.log('❌ Migration 039 is INCOMPLETE');
    console.log('   - Manual intervention required');
    console.log('   - Please check the migration SQL and re-run if necessary');
  }
}
```

**受け入れ基準:**
- [ ] 検証結果が見やすく表示される
- [ ] 成功/失敗が明確に区別される
- [ ] 詳細情報が適切に表示される
- [ ] 次のステップが示される

---

### Task 2.7: メイン関数の実装
**優先度:** 高  
**見積もり:** 20分

**説明:**
すべての検証ロジックを統合するメイン関数を実装する。

**実装内容:**
```typescript
async function verifyMigrationDirect(): Promise<void> {
  let pool: Pool | null = null;
  
  try {
    console.log('🚀 Starting Migration 039 verification (Direct PostgreSQL)...\n');
    
    // 1. データベース接続
    pool = createDatabasePool();
    await testConnection(pool);
    
    // 2. sync_health テーブル検証
    console.log('\n📋 Checking sync_health table...');
    const syncHealthExists = await checkTableExists(pool, 'sync_health');
    
    let syncHealthColumns: string[] | undefined;
    let syncHealthSample: any | undefined;
    
    if (syncHealthExists) {
      syncHealthColumns = await getTableColumns(pool, 'sync_health');
      const recordCount = await getRecordCount(pool, 'sync_health');
      console.log(`   Records: ${recordCount}`);
      
      if (recordCount > 0) {
        syncHealthSample = await getSampleData(pool, 'sync_health');
      }
    }
    
    // 3. sync_logs カラム検証
    console.log('\n📋 Checking sync_logs columns...');
    const syncLogsColumns = await checkSyncLogsColumns(pool);
    
    // 4. 結果の集約
    const result: VerificationResult = {
      syncHealthExists,
      syncHealthColumns,
      syncHealthSample,
      syncLogsColumnsExist: {
        missing_sellers_detected: syncLogsColumns.missing_sellers_detected.exists,
        triggered_by: syncLogsColumns.triggered_by.exists,
        health_status: syncLogsColumns.health_status.exists,
      },
      isComplete: 
        syncHealthExists &&
        syncLogsColumns.missing_sellers_detected.exists &&
        syncLogsColumns.triggered_by.exists &&
        syncLogsColumns.health_status.exists,
    };
    
    // 5. レポート生成
    generateReport(result);
    
    // 6. 終了コード設定
    process.exit(result.isComplete ? 0 : 1);
    
  } catch (error: any) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('   Stack trace:', error.stack);
    process.exit(1);
  } finally {
    // 7. 接続クローズ
    if (pool) {
      await pool.end();
      console.log('\n🔌 Database connection closed');
    }
  }
}
```

**受け入れ基準:**
- [ ] すべての検証ステップが実行される
- [ ] エラーハンドリングが適切に実装されている
- [ ] 接続が確実にクローズされる
- [ ] 終了コードが適切に設定される

---

## Phase 3: テストと検証

### Task 3.1: ローカル環境でのテスト
**優先度:** 高  
**見積もり:** 15分

**説明:**
ローカル環境でスクリプトを実行してテストする。

**実装内容:**
```bash
cd backend
npx ts-node verify-migration-039-direct.ts
```

**受け入れ基準:**
- [ ] スクリプトがエラーなく実行される
- [ ] 検証結果が正しく表示される
- [ ] 接続が正常にクローズされる

---

### Task 3.2: エラーケースのテスト
**優先度:** 中  
**見積もり:** 20分

**説明:**
エラーケースをテストして、エラーハンドリングが正しく動作することを確認する。

**テストケース:**
1. DATABASE_URLが未設定の場合
2. 接続情報が間違っている場合
3. テーブルが存在しない場合
4. カラムが存在しない場合

**受け入れ基準:**
- [ ] すべてのエラーケースで適切なエラーメッセージが表示される
- [ ] スクリプトが適切に終了する
- [ ] 接続が確実にクローズされる

---

### Task 3.3: ドキュメント作成
**優先度:** 中  
**見積もり:** 20分

**説明:**
スクリプトの使用方法をドキュメント化する。

**実装内容:**
`backend/VERIFY_MIGRATION_039_DIRECT.md` を作成：
```markdown
# Migration 039 Direct Verification

## 概要
PostgRESTをバイパスしてPostgreSQLに直接接続し、Migration 039の実行結果を検証します。

## 使用方法
```bash
cd backend
npx ts-node verify-migration-039-direct.ts
```

## 前提条件
- Node.js 18以上
- TypeScript 5以上
- `pg` パッケージがインストール済み
- `.env` ファイルに `DATABASE_URL` が設定済み

## トラブルシューティング
...
```

**受け入れ基準:**
- [ ] ドキュメントが作成されている
- [ ] 使用方法が明確に記載されている
- [ ] トラブルシューティング情報が含まれている

---

## Phase 4: 本番環境での実行

### Task 4.1: 本番環境での検証
**優先度:** 高  
**見積もり:** 10分

**説明:**
本番環境でスクリプトを実行して、Migration 039の状態を確認する。

**実装内容:**
```bash
cd backend
npx ts-node verify-migration-039-direct.ts
```

**受け入れ基準:**
- [ ] スクリプトが正常に実行される
- [ ] 検証結果が表示される
- [ ] Migration 039の状態が明確になる

---

### Task 4.2: 結果の分析と次のステップの決定
**優先度:** 高  
**見積もり:** 15分

**説明:**
検証結果を分析し、次のステップを決定する。

**成功の場合:**
1. PostgRESTのキャッシュ問題が確認される
2. 自動同期サービスでも直接PostgreSQL接続を使用することを検討
3. Supabaseサポートにキャッシュ問題を報告

**失敗の場合:**
1. マイグレーションSQLが正しく実行されていない可能性
2. Supabaseダッシュボードでの実行ログを再確認
3. 手動でSQLを再実行

**受け入れ基準:**
- [ ] 検証結果が分析されている
- [ ] 次のステップが明確になっている
- [ ] 必要なアクションが特定されている

---

## 見積もり合計

- Phase 1: 10分
- Phase 2: 145分
- Phase 3: 55分
- Phase 4: 25分

**合計: 約235分（約4時間）**

## 優先順位

1. **最優先（Phase 1-2）:** 検証スクリプトの実装
2. **高優先（Phase 3）:** テストと検証
3. **中優先（Phase 4）:** 本番環境での実行と分析

## 依存関係

```
Task 1.1 → Task 2.1
Task 1.2 → Task 2.2
Task 2.1 → Task 2.2 → Task 2.3 → Task 2.4 → Task 2.5 → Task 2.6 → Task 2.7
Task 2.7 → Task 3.1 → Task 3.2 → Task 3.3
Task 3.3 → Task 4.1 → Task 4.2
```
