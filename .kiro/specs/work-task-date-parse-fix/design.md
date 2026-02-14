# 業務リスト日付パース修正 - 設計ドキュメント

## 1. 設計概要

`WorkTaskColumnMapper.ts`の`parseDate`メソッドを修正して、時刻付き日付形式（`YYYY/MM/DD HH:MM:SS`）に対応します。

## 2. アーキテクチャ

### 2.1 対象ファイル

**変更対象**:
- `backend/src/services/WorkTaskColumnMapper.ts` - 日付パース処理

**変更なし**:
- `backend/src/services/WorkTaskSyncService.ts` - 同期処理（変更不要）
- `backend/src/config/work-task-column-mapping.json` - カラムマッピング設定（変更不要）

### 2.2 システム隔離

**重要**: 業務リスト専用のファイルのみを変更します。

- ✅ `backend/src/services/WorkTaskColumnMapper.ts` - 業務リスト専用
- ❌ `backend/src/services/EnhancedAutoSyncService.ts` - 売主リスト専用（変更しない）
- ❌ `backend/src/services/PropertyListingService.ts` - 物件リスト専用（変更しない）
- ❌ `backend/api/src/services/PropertyListingService.ts` - 物件公開サイト専用（変更しない）

## 3. 詳細設計

### 3.1 日付パース処理の修正

#### 現在の実装

```typescript
// YYYY/MM/DD形式
if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
  const parts = str.split('/');
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**問題**: 時刻部分がある場合（`YYYY/MM/DD HH:MM:SS`）にマッチしません。

#### 修正後の実装

```typescript
// YYYY/MM/DD形式（時刻付きも対応）
if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(str)) {
  // 時刻部分を削除（スペースより前の部分のみを使用）
  const datePart = str.split(' ')[0];
  const parts = datePart.split('/');
  const year = parts[0];
  const month = parts[1].padStart(2, '0');
  const day = parts[2].padStart(2, '0');
  return `${year}-${month}-${day}`;
}
```

**変更点**:
1. 正規表現から`$`を削除（文字列の終端を要求しない）
2. `str.split(' ')[0]`で時刻部分を削除
3. 日付部分のみを使用してパース

### 3.2 サポートする日付形式

修正後、以下の形式をサポートします：

| 形式 | 例 | 変換後 | 備考 |
|------|-----|--------|------|
| `YYYY-MM-DD` | `2026-02-15` | `2026-02-15` | そのまま |
| `YYYY/MM/DD` | `2026/02/15` | `2026-02-15` | スラッシュをハイフンに変換 |
| `YYYY/MM/DD HH:MM:SS` | `2026/02/15 18:05:00` | `2026-02-15` | 時刻部分を削除 |
| `MM/DD` | `02/15` | `2026-02-15` | 現在の年を使用 |
| その他 | `2026-02-15T00:00:00Z` | `2026-02-15` | `Date`オブジェクトでパース |

### 3.3 処理フロー

```
入力: "2026/02/15 18:05:00"
  ↓
正規表現チェック: /^\d{4}\/\d{1,2}\/\d{1,2}/ → マッチ
  ↓
時刻部分を削除: "2026/02/15 18:05:00".split(' ')[0] → "2026/02/15"
  ↓
スラッシュで分割: ["2026", "02", "15"]
  ↓
ハイフンで結合: "2026-02-15"
  ↓
出力: "2026-02-15"
```

## 4. データフロー

```
スプレッドシート（業務依頼シート）
  ↓
Google Sheets API
  ↓
WorkTaskSyncService.syncAll()
  ↓
WorkTaskColumnMapper.mapToDatabase()
  ↓
WorkTaskColumnMapper.parseDate() ← 修正対象
  ↓
Supabase (work_tasksテーブル)
```

## 5. エラーハンドリング

### 5.1 パース失敗時の処理

```typescript
try {
  // 日付パース処理
  // ...
  return date.toISOString().split('T')[0];
} catch {
  return null;  // パース失敗時はnullを返す
}
```

### 5.2 空文字列の処理

```typescript
if (!value) return null;

const str = String(value).trim();
if (!str) return null;
```

## 6. テスト設計

### 6.1 ユニットテスト

**テストケース**:

1. `YYYY/MM/DD HH:MM:SS`形式のパース
   - 入力: `"2026/02/15 18:05:00"`
   - 期待値: `"2026-02-15"`

2. `YYYY/MM/DD`形式のパース（既存の動作）
   - 入力: `"2026/02/15"`
   - 期待値: `"2026-02-15"`

3. `YYYY-MM-DD`形式のパース（既存の動作）
   - 入力: `"2026-02-15"`
   - 期待値: `"2026-02-15"`

4. `MM/DD`形式のパース（既存の動作）
   - 入力: `"02/15"`
   - 期待値: `"2026-02-15"`（現在の年を使用）

5. 空文字列の処理
   - 入力: `""`
   - 期待値: `null`

6. null/undefinedの処理
   - 入力: `null`
   - 期待値: `null`

### 6.2 統合テスト

**テストケース**:

1. AA12495の再同期
   - 前提条件: スプレッドシートに`"2026/02/15 18:05:00"`が入っている
   - 実行: `npx ts-node backend/sync-work-tasks.ts`
   - 期待値: データベースに`"2026-02-15"`が保存される

2. 既存データの同期確認
   - 前提条件: 既存の物件データがスプレッドシートに存在する
   - 実行: `npx ts-node backend/sync-work-tasks.ts`
   - 期待値: 既存データが正しく同期される

## 7. パフォーマンス考慮事項

### 7.1 正規表現の最適化

**変更前**:
```typescript
if (/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) {
```

**変更後**:
```typescript
if (/^\d{4}\/\d{1,2}\/\d{1,2}/.test(str)) {
```

**影響**: 正規表現の`$`を削除することで、わずかにパフォーマンスが向上します（終端チェックが不要）。

### 7.2 文字列分割の最適化

```typescript
const datePart = str.split(' ')[0];
```

**影響**: `split()`は高速な操作であり、パフォーマンスへの影響は無視できます。

## 8. セキュリティ考慮事項

### 8.1 入力検証

- 正規表現で日付形式を検証
- `Date`オブジェクトでパース失敗時は`null`を返す
- SQLインジェクションのリスクなし（Supabaseクライアントを使用）

### 8.2 データ整合性

- 日付のみを保存（時刻部分は削除）
- `YYYY-MM-DD`形式で統一
- データベースのスキーマに準拠

## 9. 運用考慮事項

### 9.1 デプロイ手順

1. コードを修正
2. ローカルでテスト
3. Gitにコミット
4. Vercelに自動デプロイ
5. AA12495を再同期

### 9.2 ロールバック計画

- Gitで変更前のコミットに戻す
- Vercelで前のデプロイメントにロールバック

### 9.3 モニタリング

- Vercel Dashboardでログを確認
- エラーが発生した場合は、Supabaseのログを確認

## 10. 正確性プロパティ

### Property 1: 時刻付き日付の正しいパース

**プロパティ**: 時刻付き日付（`YYYY/MM/DD HH:MM:SS`）が正しく日付のみ（`YYYY-MM-DD`）にパースされる

**検証方法**:
```typescript
// 入力
const input = "2026/02/15 18:05:00";

// 実行
const result = parseDate(input);

// 検証
assert(result === "2026-02-15");
```

**Validates: Requirements 1.1** (US-1: 時刻付き日付のパース)

### Property 2: 既存の日付形式のサポート維持

**プロパティ**: 既存の日付形式（`YYYY/MM/DD`, `YYYY-MM-DD`, `MM/DD`）が正しくパースされる

**検証方法**:
```typescript
// テストケース1: YYYY/MM/DD
assert(parseDate("2026/02/15") === "2026-02-15");

// テストケース2: YYYY-MM-DD
assert(parseDate("2026-02-15") === "2026-02-15");

// テストケース3: MM/DD
const currentYear = new Date().getFullYear();
assert(parseDate("02/15") === `${currentYear}-02-15`);
```

**Validates: Requirements 1.2** (US-2: 既存の日付形式のサポート維持)

### Property 3: 空文字列とnullの処理

**プロパティ**: 空文字列、null、undefinedが正しく`null`として処理される

**検証方法**:
```typescript
assert(parseDate("") === null);
assert(parseDate(null) === null);
assert(parseDate(undefined) === null);
```

**Validates: Requirements 1.3** (エラーハンドリング)

## 11. まとめ

### 変更内容

1. `WorkTaskColumnMapper.ts`の`parseDate`メソッドを修正
2. 時刻付き日付形式（`YYYY/MM/DD HH:MM:SS`）に対応
3. 既存の日付形式のサポートを維持

### 影響範囲

- ✅ 業務リスト専用のファイルのみを変更
- ❌ 他のシステムには影響を与えない

### 次のステップ

1. 実装タスクの作成
2. コードの修正
3. テストの実行
4. AA12495の再同期

---

**作成日**: 2026年2月15日  
**作成者**: Kiro AI  
**ステータス**: Draft
