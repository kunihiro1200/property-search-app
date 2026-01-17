# PostgREST Schema Cache Bypass Solution - 設計書

## アーキテクチャ概要

```
┌─────────────────────────────────────────────────────────────┐
│                  verify-migration-039-direct.ts              │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  1. 環境変数読み込み (dotenv)                      │    │
│  │     - DATABASE_URL                                  │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  2. PostgreSQL直接接続 (pg.Pool)                   │    │
│  │     - PostgRESTをバイパス                          │    │
│  │     - キャッシュ問題を回避                         │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  3. テーブル存在確認                               │    │
│  │     - sync_health テーブル                         │    │
│  │     - information_schema.tables クエリ             │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  4. カラム存在確認                                 │    │
│  │     - sync_logs.missing_sellers_detected           │    │
│  │     - sync_logs.triggered_by                       │    │
│  │     - sync_logs.health_status                      │    │
│  │     - information_schema.columns クエリ            │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  5. サンプルデータ取得                             │    │
│  │     - sync_health から1件取得                      │    │
│  │     - カラム構造の確認                             │    │
│  └────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌────────────────────────────────────────────────────┐    │
│  │  6. 結果レポート生成                               │    │
│  │     - 成功/失敗ステータス                          │    │
│  │     - 詳細情報                                     │    │
│  └────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                          ↓
                    コンソール出力
```

## データフロー

### 1. 接続確立フロー
```typescript
環境変数読み込み
    ↓
DATABASE_URL検証
    ↓
pg.Pool作成
    ↓
接続テスト
    ↓
成功 → 検証開始
失敗 → エラー表示 & 終了
```

### 2. テーブル検証フロー
```typescript
sync_health テーブル確認
    ↓
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_name = 'sync_health'
)
    ↓
存在する → カラム構造取得
存在しない → エラー記録
    ↓
サンプルデータ取得
SELECT * FROM sync_health LIMIT 1
```

### 3. カラム検証フロー
```typescript
各カラムの存在確認
    ↓
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'sync_logs' 
  AND column_name IN (
    'missing_sellers_detected',
    'triggered_by',
    'health_status'
  )
    ↓
結果を配列で取得
    ↓
期待されるカラムと比較
```

## コンポーネント設計

### 1. メイン関数: `verifyMigrationDirect()`
```typescript
async function verifyMigrationDirect(): Promise<void> {
  // 1. 環境変数読み込み
  // 2. PostgreSQL接続
  // 3. テーブル検証
  // 4. カラム検証
  // 5. 結果レポート
  // 6. 接続クローズ
}
```

### 2. 接続管理: `createDatabasePool()`
```typescript
function createDatabasePool(): pg.Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is not set');
  }
  
  return new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 30000,
  });
}
```

### 3. テーブル検証: `checkTableExists()`
```typescript
async function checkTableExists(
  pool: pg.Pool, 
  tableName: string
): Promise<boolean> {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = $1
    )
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows[0].exists;
}
```

### 4. カラム検証: `checkColumnsExist()`
```typescript
async function checkColumnsExist(
  pool: pg.Pool,
  tableName: string,
  columnNames: string[]
): Promise<Map<string, ColumnInfo>> {
  const query = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = ANY($2)
  `;
  
  const result = await pool.query(query, [tableName, columnNames]);
  
  const columnMap = new Map<string, ColumnInfo>();
  for (const row of result.rows) {
    columnMap.set(row.column_name, {
      dataType: row.data_type,
      isNullable: row.is_nullable === 'YES',
    });
  }
  
  return columnMap;
}
```

### 5. サンプルデータ取得: `getSampleData()`
```typescript
async function getSampleData(
  pool: pg.Pool,
  tableName: string
): Promise<any | null> {
  const query = `SELECT * FROM ${tableName} LIMIT 1`;
  const result = await pool.query(query);
  return result.rows.length > 0 ? result.rows[0] : null;
}
```

### 6. レポート生成: `generateReport()`
```typescript
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

function generateReport(result: VerificationResult): void {
  console.log('🔍 Verifying Migration 039 (Direct PostgreSQL Connection)...\n');
  
  // sync_health テーブル
  console.log('1. Checking sync_health table...');
  if (result.syncHealthExists) {
    console.log('✅ sync_health table exists');
    if (result.syncHealthColumns) {
      console.log(`   Columns: ${result.syncHealthColumns.join(', ')}`);
    }
    if (result.syncHealthSample) {
      console.log('   Sample:', JSON.stringify(result.syncHealthSample, null, 2));
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
  } else {
    console.log('❌ Migration 039 is INCOMPLETE');
    console.log('   - Manual intervention required');
  }
}
```

## エラーハンドリング

### 1. 接続エラー
```typescript
try {
  const pool = createDatabasePool();
  await pool.query('SELECT 1'); // 接続テスト
} catch (error) {
  console.error('❌ Database connection failed:', error.message);
  console.error('   Please check your DATABASE_URL in .env file');
  process.exit(1);
}
```

### 2. クエリエラー
```typescript
try {
  const result = await pool.query(query, params);
} catch (error) {
  console.error(`❌ Query failed: ${query}`);
  console.error(`   Error: ${error.message}`);
  throw error;
}
```

### 3. 環境変数エラー
```typescript
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is not set');
  console.error('   Please add DATABASE_URL to your .env file');
  console.error('   Format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres');
  process.exit(1);
}
```

## セキュリティ考慮事項

### 1. 接続情報の保護
- DATABASE_URLを環境変数から取得
- ログに接続情報を出力しない
- SSL接続を使用（`ssl: { rejectUnauthorized: false }`）

### 2. SQLインジェクション対策
- パラメータ化クエリを使用（`$1`, `$2`）
- ユーザー入力を直接SQLに埋め込まない
- テーブル名とカラム名は定数として定義

### 3. 読み取り専用操作
- SELECT文のみを使用
- INSERT/UPDATE/DELETE文は使用しない
- トランザクションは不要

## パフォーマンス最適化

### 1. 接続プール
```typescript
const pool = new pg.Pool({
  connectionString: databaseUrl,
  max: 1, // 検証スクリプトなので1接続で十分
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});
```

### 2. クエリ最適化
- `LIMIT 1` でサンプルデータを制限
- `information_schema` クエリを効率化
- 不要なカラムは取得しない

### 3. 並列実行
```typescript
// テーブル検証とカラム検証を並列実行
const [syncHealthExists, syncLogsColumns] = await Promise.all([
  checkTableExists(pool, 'sync_health'),
  checkColumnsExist(pool, 'sync_logs', [
    'missing_sellers_detected',
    'triggered_by',
    'health_status',
  ]),
]);
```

## テスト戦略

### 1. 単体テスト
- 各関数を個別にテスト
- モックデータベース接続を使用
- エラーケースをカバー

### 2. 統合テスト
- 実際のデータベースに接続
- マイグレーション実行後に検証
- 成功ケースと失敗ケースをテスト

### 3. 手動テスト
- ローカル環境で実行
- 本番環境で実行
- エラーメッセージの確認

## デプロイメント

### 1. 実行方法
```bash
cd backend
npx ts-node verify-migration-039-direct.ts
```

### 2. 前提条件
- Node.js 18以上
- TypeScript 5以上
- `pg` パッケージがインストール済み
- `.env` ファイルに `DATABASE_URL` が設定済み

### 3. 依存関係インストール
```bash
npm install pg @types/pg
```

## 今後の拡張

### 1. 自動同期サービスでの直接接続
`EnhancedAutoSyncService` でも直接PostgreSQL接続を使用することを検討：
- PostgRESTのキャッシュ問題を完全に回避
- より確実なデータ同期
- パフォーマンスの向上

### 2. 汎用的な検証ツール
他のマイグレーションでも使用できる汎用的な検証ツールに拡張：
- マイグレーション番号を引数で指定
- 検証項目を設定ファイルで定義
- 複数のマイグレーションを一括検証

### 3. CI/CDパイプライン統合
- GitHub Actionsでの自動検証
- マイグレーション実行後の自動チェック
- 失敗時の通知
