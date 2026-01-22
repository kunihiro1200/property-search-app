# 設計書

## 概要

通話モードページに追客ログの履歴テーブルを表示する機能を実装します。現在、`FollowUpLogHistoryTable`コンポーネントがスプレッドシートからデータを取得していますが、SQL構文エラーが発生しているため、データベースから直接追客ログを取得する新しいテーブルコンポーネントを実装します。

## アーキテクチャ

### データフロー

```
CallModePage
    ↓
ActivityLogTable (新規コンポーネント)
    ↓
GET /sellers/:id/activities (既存API)
    ↓
ActivityLogService (既存サービス)
    ↓
activities テーブル + employees テーブル (JOIN)
```

### 既存の問題

1. **FollowUpLogHistoryTable**: スプレッドシートからデータを取得（APPSHEET履歴用）
2. **SQL構文エラー**: データベースから追客ログを取得する際にエラーが発生
3. **原因**: SQLクエリの構文エラー（予約語のエスケープ不足、カラム名の誤り等）

### 解決策

1. データベースから追客ログを取得する新しいコンポーネント `ActivityLogTable` を作成
2. 既存の `/sellers/:id/activities` APIを使用
3. SQL構文エラーを修正（必要に応じて）
4. 通話モードページに両方のテーブルを表示（APPSHEET履歴 + データベース履歴）

## コンポーネントとインターフェース

### 1. フロントエンド - ActivityLogTable コンポーネント

新しいコンポーネント `frontend/src/components/ActivityLogTable.tsx` を作成します。

#### 主要な機能

1. **データ取得**
   - 既存の `/sellers/:id/activities` APIを使用
   - 売主IDに紐づく追客ログを取得
   - 担当者情報を含む

2. **テーブル表示**
   - 日時、担当者、種別、内容を列として表示
   - 最新の追客ログを上位に表示
   - 最大20件を表示
   - スクロール可能

3. **種別アイコン**
   - 電話: Phone アイコン
   - メール: Email アイコン
   - SMS: Message アイコン
   - 訪問: LocationOn アイコン
   - その他: Info アイコン

4. **担当者表示**
   - `getDisplayName` ユーティリティを使用
   - メールアドレスから表示名を生成（例: "tomoko.kunihiro@ifoo-oita.com" → "K"）

#### インターフェース

```typescript
interface ActivityLogTableProps {
  sellerId: number;
}

interface Activity {
  id: number;
  sellerId: number;
  type: 'call' | 'email' | 'sms' | 'visit' | 'other';
  content: string;
  createdAt: string;
  employee?: {
    id: number;
    email: string;
    name: string;
  };
}
```

### 2. バックエンド - SQL構文エラーの修正

既存の `/sellers/:id/activities` APIは正常に動作していますが、SQL構文エラーが発生している場合は、以下の点を確認・修正します。

#### 確認ポイント

1. **予約語のエスケープ**
   - `type`, `date`, `order` などの予約語をバッククォートで囲む
   - 例: `` `type` ``, `` `date` ``, `` `order` ``

2. **カラム名の確認**
   - `activities` テーブルのカラム名が正しいか確認
   - `employees` テーブルとのJOINが正しいか確認

3. **JOIN句の構文**
   - LEFT JOIN の構文が正しいか確認
   - ON句の条件が正しいか確認

#### 修正例

```sql
-- 修正前（エラーが発生する可能性）
SELECT 
  a.id,
  a.seller_id,
  a.type,
  a.content,
  a.created_at,
  e.id as employee_id,
  e.email,
  e.name
FROM activities a
LEFT JOIN employees e ON a.employee_id = e.id
WHERE a.seller_id = ?
ORDER BY a.created_at DESC
LIMIT 20;

-- 修正後（予約語をエスケープ）
SELECT 
  a.id,
  a.seller_id,
  a.`type`,
  a.content,
  a.created_at,
  e.id as employee_id,
  e.email,
  e.name
FROM activities a
LEFT JOIN employees e ON a.employee_id = e.id
WHERE a.seller_id = ?
ORDER BY a.created_at DESC
LIMIT 20;
```

### 3. CallModePage の修正

`frontend/src/pages/CallModePage.tsx` に新しい `ActivityLogTable` コンポーネントを追加します。

#### 配置

```tsx
{/* 追客ログ履歴（データベース） */}
<ActivityLogTable sellerId={parseInt(id!)} />

{/* 追客ログ履歴（APPSHEET） */}
{seller?.sellerNumber && (
  <FollowUpLogHistoryTable sellerNumber={seller.sellerNumber} />
)}
```

## データモデル

### 既存のデータモデルを使用

- `Activity`: 活動履歴（追客ログを含む）
- `Employee`: 社員情報

新しいデータモデルは不要です。

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。*

### Property 1: データ取得の正確性

*任意の* 売主IDに対して、追客ログテーブルは該当する売主の追客ログのみを表示するべきである

**検証: 要件 1.1, 4.1**

### Property 2: ソート順の一貫性

*任意の* 追客ログリストに対して、最新の追客ログが常に上位に表示されるべきである

**検証: 要件 1.3, 4.3**

### Property 3: 表示件数の制限

*任意の* 売主に対して、追客ログテーブルは最大20件のログのみを表示するべきである

**検証: 要件 1.4, 4.4**

### Property 4: 担当者表示の一貫性

*任意の* 追客ログに対して、担当者のメールアドレスから生成される表示名は常に同じであるべきである

**検証: 要件 3.2, 3.4**

### Property 5: SQL構文の正確性

*任意の* SQLクエリに対して、構文エラーが発生しないべきである

**検証: 要件 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: 種別アイコンの一貫性

*任意の* 追客ログの種別に対して、対応するアイコンが表示されるべきである

**検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 7: 空データの処理

*任意の* 売主に対して、追客ログが存在しない場合は「追客ログがありません」というメッセージが表示されるべきである

**検証: 要件 1.5**

## エラーハンドリング

### 1. データ取得エラー

**シナリオ:** 追客ログの取得に失敗

**対応:**
- エラーメッセージを表示
- ローディング状態を解除
- リトライボタンを提供

### 2. SQL構文エラー

**シナリオ:** SQLクエリの構文エラー

**対応:**
- バックエンドでエラーをキャッチ
- 詳細なエラーログを出力
- フロントエンドに適切なエラーメッセージを返す

### 3. 担当者情報の欠落

**シナリオ:** 追客ログに担当者情報が含まれていない

**対応:**
- 担当者名を「不明」と表示
- エラーを発生させずに処理を続行

## テスト戦略

### ユニットテスト

1. **ActivityLogTable コンポーネント**
   - データ取得が正しく行われることを確認
   - テーブルが正しく表示されることを確認
   - 種別アイコンが正しく表示されることを確認
   - 担当者表示名が正しく生成されることを確認

2. **SQL構文の検証**
   - SQLクエリが正しく構築されることを確認
   - 予約語が正しくエスケープされることを確認
   - JOIN句が正しく動作することを確認

### 統合テスト

1. **エンドツーエンドフロー**
   - 通話モードページを開く
   - 追客ログテーブルが表示されることを確認
   - データが正しく表示されることを確認

2. **エラーハンドリング**
   - データ取得エラーが正しく処理されることを確認
   - SQL構文エラーが発生しないことを確認

### プロパティベーステスト

1. **Property 1: データ取得の正確性**
   - ランダムな売主IDに対して、該当する追客ログのみが返されることを確認

2. **Property 2: ソート順の一貫性**
   - ランダムな追客ログリストに対して、最新のログが上位に表示されることを確認

3. **Property 3: 表示件数の制限**
   - ランダムな売主に対して、最大20件のログのみが表示されることを確認

4. **Property 4: 担当者表示の一貫性**
   - ランダムなメールアドレスに対して、同じ表示名が生成されることを確認

5. **Property 5: SQL構文の正確性**
   - ランダムな売主IDに対して、SQLクエリが正しく実行されることを確認

## 実装の注意事項

### パフォーマンス

- 既存のAPIエンドポイントを再利用
- データ取得は並列で実行（Promise.all）
- LIMIT句を使用して取得件数を制限

### UI/UX

- レスポンシブデザインを適用
- スクロール可能なテーブル
- ローディング状態を表示
- エラー状態を表示

### アクセシビリティ

- テーブルヘッダーを固定
- キーボードナビゲーションをサポート
- スクリーンリーダー対応

### セキュリティ

- 既存の認証ミドルウェアを使用
- SQLインジェクション対策（パラメータ化クエリ）
- XSS対策（エスケープ処理）

## 実装手順

1. **ActivityLogTable コンポーネントの作成**
   - `frontend/src/components/ActivityLogTable.tsx` を作成
   - データ取得ロジックを実装
   - テーブル表示ロジックを実装

2. **SQL構文エラーの修正**
   - `backend/src/services/ActivityLogService.ts` を確認
   - 必要に応じてSQLクエリを修正

3. **CallModePage の修正**
   - `ActivityLogTable` コンポーネントをインポート
   - 適切な位置に配置

4. **テストの実装**
   - ユニットテストを作成
   - 統合テストを作成
   - プロパティベーステストを作成

5. **動作確認**
   - 通話モードページを開いて動作確認
   - エラーが発生しないことを確認
   - データが正しく表示されることを確認
