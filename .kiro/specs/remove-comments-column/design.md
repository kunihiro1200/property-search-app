# Design Document: Remove Comments Column from Sellers Table

## Overview

このドキュメントは、sellersテーブルから`comments`カラムを削除するマイグレーションの設計を定義します。このカラムはマイグレーション009で追加されましたが、売主リストスプレッドシートには対応するカラムが存在しないため、データベースとスプレッドシートのスキーマの不一致を解消します。

## Architecture

### システム構成

```
┌─────────────────────────────────────┐
│  Migration Script (087)             │
│  - remove_comments_from_sellers.sql │
│  - rollback script                  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PostgreSQL Database                │
│  - sellers table                    │
│  - DROP COLUMN comments             │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  PostgREST Schema Cache             │
│  - NOTIFY pgrst for reload          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Verification Script                │
│  - Confirm column removal           │
└─────────────────────────────────────┘
```

### マイグレーション戦略

1. **Forward Migration**: commentsカラムを削除
2. **Rollback Migration**: commentsカラムを復元
3. **Schema Cache Reload**: PostgRESTキャッシュを更新
4. **Verification**: 変更を検証

## Components and Interfaces

### 1. Forward Migration Script

**ファイル名**: `087_remove_comments_from_sellers.sql`

**責任**:
- sellersテーブルからcommentsカラムを削除
- インデックスやコメントも削除
- PostgRESTスキーマキャッシュをリロード

**インターフェース**:
```sql
-- Input: 既存のsellersテーブル（commentsカラムあり）
-- Output: sellersテーブル（commentsカラムなし）
ALTER TABLE sellers DROP COLUMN IF EXISTS comments;
```

### 2. Rollback Migration Script

**ファイル名**: `087_remove_comments_from_sellers_rollback.sql`

**責任**:
- commentsカラムを復元（TEXT型）
- カラムコメントを復元

**インターフェース**:
```sql
-- Input: sellersテーブル（commentsカラムなし）
-- Output: sellersテーブル（commentsカラムあり）
ALTER TABLE sellers ADD COLUMN IF NOT EXISTS comments TEXT;
COMMENT ON COLUMN sellers.comments IS 'コメント（ヒアリング内容）';
```

### 3. Migration Execution Script

**ファイル名**: `run-087-migration.ts`

**責任**:
- マイグレーションSQLを実行
- 実行ログを記録
- エラーハンドリング

**インターフェース**:
```typescript
async function runMigration(): Promise<void>
// Input: なし
// Output: コンソールログ、実行結果
```

### 4. Verification Script

**ファイル名**: `verify-087-migration.ts`

**責任**:
- commentsカラムが削除されたことを確認
- sellersテーブルのスキーマを検証

**インターフェース**:
```typescript
async function verifyMigration(): Promise<boolean>
// Input: なし
// Output: 検証結果（true/false）
```

## Data Models

### Sellers Table Schema (Before)

```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY,
  seller_number VARCHAR(20),
  name VARCHAR(255),
  -- ... other columns ...
  comments TEXT,  -- ← このカラムを削除
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

### Sellers Table Schema (After)

```sql
CREATE TABLE sellers (
  id UUID PRIMARY KEY,
  seller_number VARCHAR(20),
  name VARCHAR(255),
  -- ... other columns ...
  -- comments カラムは削除済み
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);
```

## Correctness Properties

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。プロパティは、人間が読める仕様と機械で検証可能な正確性の保証との橋渡しとなります。*

### Property 1: カラム削除の完全性

*For any* sellersテーブルのスキーマクエリ、commentsカラムは結果に含まれないこと

**Validates: Requirements 1.1**

### Property 2: データ保全性

*For any* sellersテーブルの既存レコード、マイグレーション実行後も他のカラムのデータは変更されないこと

**Validates: Requirements 1.2**

### Property 3: ロールバックの可逆性

*For any* ロールバックスクリプトの実行、commentsカラムが正しいデータ型（TEXT）で復元されること

**Validates: Requirements 3.2**

### Property 4: スキーマキャッシュの同期

*For any* PostgREST APIクエリ、マイグレーション実行後はcommentsカラムに関するエラーが発生しないこと

**Validates: Requirements 4.3**

## Error Handling

### マイグレーション実行時のエラー

1. **カラムが存在しない場合**
   - `DROP COLUMN IF EXISTS`を使用して、カラムが存在しない場合でもエラーにならないようにする
   - ログに警告メッセージを出力

2. **データベース接続エラー**
   - 接続エラーをキャッチして、明確なエラーメッセージを表示
   - リトライロジックは実装しない（手動で再実行）

3. **権限エラー**
   - ALTER TABLE権限がない場合、エラーメッセージを表示
   - 必要な権限を明示

### ロールバック時のエラー

1. **カラムが既に存在する場合**
   - `ADD COLUMN IF NOT EXISTS`を使用
   - ログに警告メッセージを出力

2. **データ型の不一致**
   - TEXT型で復元することを保証
   - 既存データとの互換性を確認

## Testing Strategy

### Unit Tests

マイグレーションスクリプトは単純なDDL文のため、ユニットテストは不要です。代わりに、以下の検証スクリプトで確認します。

### Verification Tests

1. **マイグレーション前の状態確認**
   - commentsカラムが存在することを確認
   - sellersテーブルのレコード数を記録

2. **マイグレーション実行**
   - 087マイグレーションを実行
   - エラーが発生しないことを確認

3. **マイグレーション後の状態確認**
   - commentsカラムが存在しないことを確認
   - sellersテーブルのレコード数が変わっていないことを確認
   - 他のカラムのデータが保持されていることを確認

4. **ロールバックテスト**
   - ロールバックスクリプトを実行
   - commentsカラムが復元されることを確認
   - カラムコメントが復元されることを確認

5. **API動作確認**
   - PostgREST APIでsellersエンドポイントをクエリ
   - commentsカラムに関するエラーが発生しないことを確認

### Integration Tests

1. **スプレッドシート同期テスト**
   - 売主リストスプレッドシートからデータを同期
   - commentsカラムに関するエラーが発生しないことを確認
   - 他のカラムが正常に同期されることを確認

2. **API統合テスト**
   - sellersエンドポイントのGET/POST/PATCH/DELETEをテスト
   - commentsカラムが含まれていないことを確認

## Implementation Notes

### マイグレーション番号

- 次のマイグレーション番号は`087`
- 既存のマイグレーションファイルを確認して、番号の重複を避ける

### PostgRESTスキーマキャッシュのリロード

マイグレーション実行後、以下のSQLでスキーマキャッシュをリロードします：

```sql
NOTIFY pgrst, 'reload schema';
```

### 実行順序

1. Forward Migrationを実行
2. PostgRESTスキーマキャッシュをリロード
3. Verification Scriptで確認
4. 問題があればRollback Migrationを実行

### バックアップ推奨

マイグレーション実行前に、sellersテーブルのバックアップを取ることを推奨します：

```sql
CREATE TABLE sellers_backup_before_087 AS SELECT * FROM sellers;
```

## Dependencies

- PostgreSQL 12以上
- Supabase環境
- PostgREST
- Node.js（実行スクリプト用）
- TypeScript（実行スクリプト用）

## Deployment Considerations

### 本番環境での実行

1. **メンテナンスウィンドウ**: 必要なし（DDL操作は高速）
2. **ダウンタイム**: なし（カラム削除は瞬時）
3. **ロールバック計画**: ロールバックスクリプトを準備
4. **モニタリング**: マイグレーション実行後、APIエラーログを監視

### リスク評価

- **リスクレベル**: 低
- **理由**: 
  - 使用されていないカラムの削除
  - スプレッドシートに対応するカラムが存在しない
  - ロールバックが容易

### 影響範囲

- **影響を受けるテーブル**: sellers
- **影響を受けるAPI**: `/sellers`エンドポイント
- **影響を受けるサービス**: SellerSyncService（エラーが解消される）
