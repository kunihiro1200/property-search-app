# 設計書

## 概要

追客電話ログ機能を強化し、電話をかけた担当者の情報を表示できるようにします。現在のシステムでは、`activities`テーブルに`employee_id`が記録されていますが、フロントエンドでは担当者情報が表示されていません。この設計では、既存のデータベーススキーマを変更せずに、バックエンドAPIで`employees`テーブルとJOINして担当者情報を取得し、フロントエンドで「K 2025/12/1 14:30」のような形式で表示します。

## アーキテクチャ

### システム構成

```
┌─────────────────┐
│   Frontend      │
│  (React + TS)   │
└────────┬────────┘
         │ HTTP/REST
         ▼
┌─────────────────┐
│   Backend API   │
│  (Express + TS) │
└────────┬────────┘
         │ SQL
         ▼
┌─────────────────┐
│   Supabase DB   │
│  (PostgreSQL)   │
└─────────────────┘
```

### データフロー

1. フロントエンドが `/sellers/:id/activities` エンドポイントを呼び出す
2. バックエンドが `activities` と `employees` テーブルを JOIN してクエリ
3. 各活動ログに担当者情報（employee オブジェクト）を含めてレスポンス
4. フロントエンドが担当者のメールアドレスから表示名を生成
5. 「K 2025/12/1 14:30」形式で画面に表示

## コンポーネントとインターフェース

### 1. バックエンド - FollowUpService

#### 既存メソッドの拡張

```typescript
/**
 * 追客履歴を取得（担当者情報を含む）
 */
async getActivityHistory(sellerId: string): Promise<ActivityWithEmployee[]>
```

**変更点:**
- `employees` テーブルと LEFT JOIN
- 戻り値の型を `ActivityWithEmployee[]` に変更
- 各活動ログに `employee` オブジェクトを含める

### 2. バックエンド - 型定義

#### 新しい型の追加

```typescript
export interface ActivityWithEmployee extends Activity {
  employee: {
    id: string;
    email: string;
    name: string;
  } | null;
}
```

### 3. フロントエンド - ユーティリティ関数

#### 表示名生成関数

```typescript
/**
 * メールアドレスから表示名を生成
 * 例: tomoko.kunihiro@ifoo-oita.com → K
 */
function getDisplayNameFromEmail(email: string): string
```

**ロジック:**
1. メールアドレスの @ より前の部分を取得
2. ドット（.）で分割
3. 最後の部分（姓）の最初の文字を大文字にして返す
4. ドットがない場合は、名前全体の最初の文字を返す
5. 無効な場合は "?" を返す

#### 日時フォーマット関数

```typescript
/**
 * 日時を「2025/12/1 14:30」形式にフォーマット
 */
function formatDateTime(dateString: string): string
```

### 4. フロントエンド - SellerDetailPage

#### 通話メモダイアログの表示改善

**変更箇所:**
- 過去の通話メモリストに担当者名を追加
- 「K 2025/12/1 14:30」形式で表示

## データモデル

### 既存テーブル（変更なし）

#### activities テーブル
```sql
CREATE TABLE activities (
    id UUID PRIMARY KEY,
    seller_id UUID NOT NULL REFERENCES sellers(id),
    employee_id UUID NOT NULL REFERENCES employees(id),
    type VARCHAR(50) NOT NULL,
    content TEXT NOT NULL,
    result TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### employees テーブル
```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    google_id VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);
```

### JOIN クエリ

```sql
SELECT 
    a.*,
    e.id as employee_id,
    e.email as employee_email,
    e.name as employee_name
FROM activities a
LEFT JOIN employees e ON a.employee_id = e.id
WHERE a.seller_id = $1
ORDER BY a.created_at DESC;
```


## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。本質的には、システムが何をすべきかについての形式的な記述です。プロパティは、人間が読める仕様と機械で検証可能な正確性の保証との橋渡しとなります。*

### Property 1: 活動ログには担当者情報が含まれる

*任意の* 活動ログに対して、employee_id が存在する場合、レスポンスには employee オブジェクト（id、email、name を含む）が含まれるべきである

**検証: 要件 1.1, 3.2, 4.1, 4.2**

### Property 2: メールアドレスから表示名への変換は決定的である

*任意の* 有効なメールアドレスに対して、表示名生成関数を複数回呼び出しても、常に同じ表示名が返されるべきである

**検証: 要件 2.1, 2.4**

### Property 3: 表示形式は一貫している

*任意の* 活動ログと担当者情報に対して、表示される文字列は「<表示名> <日付> <時刻>」の形式に従うべきである

**検証: 要件 1.3**

### Property 4: 複数の担当者が正しく区別される

*任意の* 売主に対する複数の活動ログにおいて、異なる employee_id を持つログは異なる表示名を持つべきである（同じ担当者の場合は同じ表示名）

**検証: 要件 1.4**

### Property 5: API レスポンスはキャメルケースである

*任意の* 活動ログ API レスポンスにおいて、すべてのフィールド名はキャメルケース形式であるべきである（例: employee_id ではなく employeeId）

**検証: 要件 4.3**

### Property 6: 複数のログの形式は一貫している

*任意の* 活動ログのリストにおいて、すべてのログは同じ構造（employee フィールドの有無と形式）を持つべきである

**検証: 要件 4.5**

## エラーハンドリング

### 1. 担当者情報が見つからない場合

**シナリオ:** `employee_id` が `activities` テーブルに存在するが、対応する社員が `employees` テーブルに存在しない

**対応:**
- LEFT JOIN を使用して、担当者が見つからない場合でも活動ログを返す
- `employee` フィールドを `null` として返す
- フロントエンドでは、`employee` が `null` の場合、デフォルトの表示名（"?"）または日時のみを表示

### 2. 無効なメールアドレス

**シナリオ:** メールアドレスが空文字列、null、または無効な形式

**対応:**
- 表示名生成関数でバリデーションを実施
- 無効な場合はデフォルトの表示名（"?"）を返す
- エラーをスローせず、グレースフルに処理

### 3. データベース接続エラー

**シナリオ:** データベースクエリが失敗

**対応:**
- 既存のエラーハンドリング機構を使用
- 500 エラーを返し、エラーメッセージをログに記録
- フロントエンドでエラーメッセージを表示

## テスト戦略

### ユニットテスト

ユニットテストは、特定の例、エッジケース、エラー条件を検証します。

#### バックエンド

1. **FollowUpService.getActivityHistory**
   - 担当者情報が正しく JOIN されることを確認
   - 担当者が見つからない場合、employee が null になることを確認
   - 複数の活動ログが正しい順序で返されることを確認

2. **型変換**
   - スネークケースからキャメルケースへの変換が正しいことを確認

#### フロントエンド

1. **getDisplayNameFromEmail**
   - 例: "tomoko.kunihiro@ifoo-oita.com" → "K"
   - 例: "john@example.com" → "J"
   - エッジケース: 空文字列 → "?"
   - エッジケース: 無効な形式 → "?"

2. **formatDateTime**
   - ISO 8601 形式の日時文字列を「2025/12/1 14:30」形式に変換
   - タイムゾーンを考慮

3. **表示ロジック**
   - employee が null の場合、日時のみ表示
   - employee が存在する場合、「K 2025/12/1 14:30」形式で表示

### プロパティベーステスト

プロパティベーステストは、すべての入力にわたって保持されるべき普遍的なプロパティを検証します。

#### テストライブラリ

- **バックエンド:** `fast-check` (TypeScript/JavaScript 用のプロパティベーステストライブラリ)
- **フロントエンド:** `fast-check`

#### テスト設定

- 各プロパティベーステストは最低 100 回の反復を実行
- ランダムな入力を生成してプロパティを検証

#### プロパティテスト

1. **Property 1: 活動ログには担当者情報が含まれる**
   - ランダムな活動ログと担当者を生成
   - API を呼び出し、レスポンスに employee オブジェクトが含まれることを確認
   - **Feature: follow-up-call-logger-enhancement, Property 1: 活動ログには担当者情報が含まれる**

2. **Property 2: メールアドレスから表示名への変換は決定的である**
   - ランダムなメールアドレスを生成
   - 表示名生成関数を複数回呼び出し、常に同じ結果が返ることを確認
   - **Feature: follow-up-call-logger-enhancement, Property 2: メールアドレスから表示名への変換は決定的である**

3. **Property 3: 表示形式は一貫している**
   - ランダムな活動ログと担当者情報を生成
   - 表示文字列が正規表現 `^[A-Z?] \d{4}/\d{1,2}/\d{1,2} \d{1,2}:\d{2}$` にマッチすることを確認
   - **Feature: follow-up-call-logger-enhancement, Property 3: 表示形式は一貫している**

4. **Property 4: 複数の担当者が正しく区別される**
   - ランダムな数の担当者と活動ログを生成
   - 同じ employee_id を持つログは同じ表示名を持つことを確認
   - 異なる employee_id を持つログは異なる表示名を持つことを確認（メールアドレスが異なる場合）
   - **Feature: follow-up-call-logger-enhancement, Property 4: 複数の担当者が正しく区別される**

5. **Property 5: API レスポンスはキャメルケースである**
   - ランダムな活動ログを生成
   - API レスポンスのすべてのキーがキャメルケースであることを確認（スネークケースが含まれないこと）
   - **Feature: follow-up-call-logger-enhancement, Property 5: API レスポンスはキャメルケースである**

6. **Property 6: 複数のログの形式は一貫している**
   - ランダムな数の活動ログを生成
   - すべてのログが同じ構造（employee フィールドの有無）を持つことを確認
   - **Feature: follow-up-call-logger-enhancement, Property 6: 複数のログの形式は一貫している**

### 統合テスト

1. **エンドツーエンドフロー**
   - 売主を作成
   - 複数の担当者が追客電話を記録
   - 活動ログ API を呼び出し、すべての情報が正しく表示されることを確認

2. **UI 表示テスト**
   - 通話メモダイアログを開く
   - 過去の通話メモに担当者名と日時が正しく表示されることを確認

## 実装の注意事項

### パフォーマンス

- LEFT JOIN を使用することで、1 回のクエリで活動ログと担当者情報を取得
- インデックスは既に `activities.employee_id` と `employees.id` に存在するため、追加のインデックスは不要
- N+1 問題を回避

### 後方互換性

- 既存の API エンドポイントを変更するため、フロントエンドの型定義を更新
- `Activity` インターフェースを拡張して `employee` フィールドを追加
- 既存のコードが `employee` フィールドを使用していない場合でも動作するように、オプショナルフィールドとして定義

### セキュリティ

- 担当者のメールアドレスは既に認証済みユーザーにのみ公開されている情報
- 追加のセキュリティ対策は不要
- 既存の認証ミドルウェアを継続使用

### 国際化

- 日時フォーマットは日本語ロケール（ja-JP）を使用
- 表示名は英字の大文字を使用（日本語名には対応しない）
- 将来的に多言語対応が必要な場合は、表示名生成ロジックを拡張
