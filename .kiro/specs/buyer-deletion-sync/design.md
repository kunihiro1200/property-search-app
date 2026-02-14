# 買主削除同期機能 - 設計書

## 1. アーキテクチャ概要

### 1.1 システム構成

```
┌─────────────────────┐
│  スプレッドシート   │
│  (買主リスト)       │
└──────────┬──────────┘
           │
           │ 買主番号一覧を取得
           │
           ▼
┌─────────────────────┐
│ sync-deleted-buyers │ ← 手動実行スクリプト
│      .ts            │
└──────────┬──────────┘
           │
           │ 削除対象を検出
           │
           ▼
┌─────────────────────┐
│   BuyerService      │
│   .delete()         │
└──────────┬──────────┘
           │
           │ 物理削除
           │
           ▼
┌─────────────────────┐
│  Supabase           │
│  (buyers テーブル)  │
└─────────────────────┘
```

### 1.2 処理フロー

1. **削除対象の検出**
   - スプレッドシートから買主番号一覧を取得（E列、5行目から）
   - データベースから買主番号一覧を取得
   - 差分を検出（データベースにあるがスプレッドシートにない買主）

2. **削除対象の確認**
   - 削除対象の買主番号をリスト表示
   - 削除対象の買主数を表示
   - ドライランモードの場合はここで終了

3. **削除実行**
   - 確認プロンプトを表示
   - ユーザーが"yes"を入力した場合のみ削除を実行
   - `BuyerService.delete()`を使用して物理削除

4. **削除後の確認**
   - 削除された買主数を表示
   - データベースとスプレッドシートの整合性を確認

## 2. データモデル

### 2.1 buyers テーブル

削除対象のテーブル：

```sql
CREATE TABLE buyers (
  buyer_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_number TEXT NOT NULL UNIQUE,  -- 主キー（買主番号）
  name TEXT,
  phone_number TEXT,
  email TEXT,
  -- ... その他のフィールド
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.2 スプレッドシート構造

- **シート名**: `買主リスト`
- **買主番号の列**: E列
- **データ開始行**: 5行目
- **ヘッダー行**: 1-4行目（絶対に触らない）

## 3. API設計

### 3.1 BuyerService.delete()

新規メソッドを追加：

```typescript
/**
 * 買主を削除（物理削除）
 * @param buyerNumber - 買主番号（主キー）
 * @param userId - ユーザーID（監査ログ用、オプション）
 * @param userEmail - ユーザーメール（監査ログ用、オプション）
 * @returns 削除された買主データ
 */
async delete(
  buyerNumber: string,
  userId?: string,
  userEmail?: string
): Promise<any>
```

**処理内容:**
1. 買主の存在確認（`getByBuyerNumber()`）
2. 監査ログの記録（オプション）
3. データベースから物理削除
4. 削除された買主データを返す

**エラーハンドリング:**
- 買主が存在しない場合: `Error: Buyer not found`
- 削除に失敗した場合: `Error: Failed to delete buyer: {error.message}`

### 3.2 sync-deleted-buyers.ts

手動実行スクリプト：

```typescript
/**
 * スプレッドシートで削除された買主をデータベースから削除
 * 
 * 使用方法:
 * - 削除実行: npx ts-node backend/sync-deleted-buyers.ts
 * - ドライラン: npx ts-node backend/sync-deleted-buyers.ts --dry-run
 */
async function syncDeletedBuyers(dryRun: boolean = false): Promise<void>
```

**処理内容:**
1. スプレッドシートから買主番号一覧を取得
2. データベースから買主番号一覧を取得
3. 削除対象を検出
4. 削除対象をリスト表示
5. ドライランモードの場合はここで終了
6. 確認プロンプトを表示
7. ユーザーが"yes"を入力した場合のみ削除を実行
8. 削除結果を表示

## 4. 正確性プロパティ

### 4.1 Property 1: 削除対象の正確性

**プロパティ**: スプレッドシートに存在しない買主のみが削除対象として検出される

**検証方法**:
```typescript
// Property-Based Test
property('deleted buyers are only those not in spreadsheet', async () => {
  const sheetBuyerNumbers = await getSheetBuyerNumbers();
  const dbBuyerNumbers = await getDbBuyerNumbers();
  const toDelete = detectDeletedBuyers(sheetBuyerNumbers, dbBuyerNumbers);
  
  // 削除対象はスプレッドシートに存在しない
  for (const buyerNumber of toDelete) {
    assert(!sheetBuyerNumbers.has(buyerNumber));
  }
  
  // 削除対象はデータベースに存在する
  for (const buyerNumber of toDelete) {
    assert(dbBuyerNumbers.has(buyerNumber));
  }
});
```

### 4.2 Property 2: 削除の完全性

**プロパティ**: 削除実行後、データベースとスプレッドシートの買主番号が一致する

**検証方法**:
```typescript
// Property-Based Test
property('after deletion, db and sheet are in sync', async () => {
  await syncDeletedBuyers(false); // 削除実行
  
  const sheetBuyerNumbers = await getSheetBuyerNumbers();
  const dbBuyerNumbers = await getDbBuyerNumbers();
  
  // データベースの買主番号はスプレッドシートに存在する
  for (const buyerNumber of dbBuyerNumbers) {
    assert(sheetBuyerNumbers.has(buyerNumber));
  }
});
```

### 4.3 Property 3: ドライランモードの安全性

**プロパティ**: ドライランモードでは削除が実行されない

**検証方法**:
```typescript
// Property-Based Test
property('dry run does not delete any buyers', async () => {
  const dbBuyerNumbersBefore = await getDbBuyerNumbers();
  
  await syncDeletedBuyers(true); // ドライラン
  
  const dbBuyerNumbersAfter = await getDbBuyerNumbers();
  
  // 削除前後で買主数が同じ
  assert.equal(dbBuyerNumbersBefore.size, dbBuyerNumbersAfter.size);
  
  // 削除前後で買主番号が同じ
  for (const buyerNumber of dbBuyerNumbersBefore) {
    assert(dbBuyerNumbersAfter.has(buyerNumber));
  }
});
```

### 4.4 Property 4: 削除の冪等性

**プロパティ**: 削除を複数回実行しても結果は同じ

**検証方法**:
```typescript
// Property-Based Test
property('deletion is idempotent', async () => {
  await syncDeletedBuyers(false); // 1回目の削除
  const dbBuyerNumbers1 = await getDbBuyerNumbers();
  
  await syncDeletedBuyers(false); // 2回目の削除
  const dbBuyerNumbers2 = await getDbBuyerNumbers();
  
  // 1回目と2回目で買主数が同じ
  assert.equal(dbBuyerNumbers1.size, dbBuyerNumbers2.size);
  
  // 1回目と2回目で買主番号が同じ
  for (const buyerNumber of dbBuyerNumbers1) {
    assert(dbBuyerNumbers2.has(buyerNumber));
  }
});
```

## 5. エラーハンドリング

### 5.1 スプレッドシート取得エラー

**エラー**: スプレッドシートから買主番号一覧を取得できない

**対処**:
- エラーメッセージを表示
- 処理を中断

### 5.2 データベース取得エラー

**エラー**: データベースから買主番号一覧を取得できない

**対処**:
- エラーメッセージを表示
- 処理を中断

### 5.3 削除エラー

**エラー**: 買主の削除に失敗

**対処**:
- エラーメッセージを表示
- 失敗した買主番号をログに出力
- 処理を継続（他の買主の削除を試行）

## 6. セキュリティ

### 6.1 認証

- スプレッドシートAPIの認証にはサービスアカウントを使用
- データベースアクセスには`SUPABASE_SERVICE_KEY`を使用

### 6.2 権限

- 削除機能は管理者のみが実行できる
- 手動実行スクリプトはローカル環境でのみ実行

### 6.3 監査ログ

- 削除時に監査ログを記録（オプション）
- 削除日時、削除者、削除された買主番号を記録

## 7. パフォーマンス

### 7.1 スプレッドシートAPI呼び出し

- 買主番号一覧の取得: 1回のAPI呼び出し
- レート制限: `sheetsRateLimiter`を使用

### 7.2 データベースクエリ

- 買主番号一覧の取得: 1回のクエリ
- 削除: バッチ削除（複数の買主を一度に削除）

### 7.3 処理時間

- 削除対象が100件以下の場合: 10秒以内
- 削除対象が1000件以下の場合: 60秒以内

## 8. テスト戦略

### 8.1 ユニットテスト

- `BuyerService.delete()`のテスト
- 削除対象検出ロジックのテスト

### 8.2 Property-Based Test

- Property 1: 削除対象の正確性
- Property 2: 削除の完全性
- Property 3: ドライランモードの安全性
- Property 4: 削除の冪等性

### 8.3 統合テスト

- スプレッドシートとデータベースの統合テスト
- 削除実行後の整合性確認

## 9. デプロイ

### 9.1 ローカル環境

1. `backend/sync-deleted-buyers.ts`を作成
2. `BuyerService.delete()`を実装
3. テストを実行
4. 手動で削除同期を実行

### 9.2 本番環境

- 現在はローカル環境でテスト中
- 本番環境への適用は後日検討

## 10. モニタリング

### 10.1 ログ

- 削除対象の買主番号をログに出力
- 削除された買主数をログに出力
- 削除エラーが発生した場合、エラーメッセージをログに出力

### 10.2 アラート

- 削除対象が100件を超える場合、警告を表示
- 削除エラーが発生した場合、エラーを表示

## 11. 将来の拡張

### 11.1 自動同期サービスへの統合

- `EnhancedAutoSyncService`に削除検出ロジックを追加
- 5分ごとの自動同期で削除を検出して実行

### 11.2 削除履歴の記録

- 削除された買主の履歴を別テーブルに記録
- 削除日時、削除理由、削除者を記録

### 11.3 論理削除のサポート

- `deleted_at`フラグを使用した論理削除をサポート
- 削除された買主を一定期間保持してから物理削除

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: Draft
