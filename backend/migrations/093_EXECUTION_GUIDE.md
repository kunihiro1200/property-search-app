# Migration 093: RLS ポリシー修正ガイド

## 問題

「売主が見つかりませんでした」エラーが発生しています。

**原因**: Row Level Security (RLS) ポリシーが正しく設定されていないため、認証済みユーザーでもデータにアクセスできません。

## 解決策

Supabase SQL Editorで以下のSQLを実行してください。

## 実行手順

### 1. Supabase Dashboardにアクセス

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `krxhrbtlgfjzsseegaqq` を選択
3. 左メニューから **SQL Editor** をクリック

### 2. SQLを実行

1. **New query** をクリック
2. `backend/migrations/093_fix_rls_policies.sql` の内容をコピー
3. SQL Editorに貼り付け
4. **Run** ボタンをクリック

### 3. 実行結果を確認

以下のようなポリシー一覧が表示されれば成功です：

```
schemaname | tablename | policyname                              | roles
-----------+-----------+-----------------------------------------+------------------
public     | sellers   | Enable read access for authenticated... | {authenticated}
public     | sellers   | Enable insert for authenticated...      | {authenticated}
public     | sellers   | Enable update for authenticated...      | {authenticated}
public     | sellers   | Enable delete for authenticated...      | {authenticated}
public     | sellers   | Enable all access for service role      | {service_role}
```

## 代替方法: Supabase Dashboardから設定

SQL実行が難しい場合、Dashboardから設定できます：

### 1. Authentication → Policies を開く

1. 左メニューから **Authentication** をクリック
2. **Policies** タブを選択
3. **sellers** テーブルを探す

### 2. 新しいポリシーを作成

**For SELECT (読み取り):**
- Policy name: `Enable read access for authenticated users`
- Target roles: `authenticated`
- USING expression: `true`

**For INSERT (挿入):**
- Policy name: `Enable insert for authenticated users`
- Target roles: `authenticated`
- WITH CHECK expression: `true`

**For UPDATE (更新):**
- Policy name: `Enable update for authenticated users`
- Target roles: `authenticated`
- USING expression: `true`
- WITH CHECK expression: `true`

**For DELETE (削除):**
- Policy name: `Enable delete for authenticated users`
- Target roles: `authenticated`
- USING expression: `true`

## 実行後の確認

### 1. APIテスト

```bash
cd backend
npx ts-node check-sellers-api.ts
```

### 2. ブラウザで確認

1. http://localhost:5173/login にアクセス
2. Googleでログイン
3. 売主リストが表示されることを確認

## トラブルシューティング

### エラー: "permission denied for table sellers"

**原因**: RLSポリシーが正しく設定されていない

**解決策**: 
1. 上記のSQLを再度実行
2. Supabase Dashboardでポリシーが作成されているか確認

### エラー: "No authentication token provided"

**原因**: ログインしていない

**解決策**:
1. http://localhost:5173/login でGoogleログイン
2. 認証が完了してからアクセス

## 注意事項

- このマイグレーションは**Supabase SQL Editor**で実行してください
- バックエンドのマイグレーションスクリプトでは実行できません
- RLSポリシーは認証済みユーザーのみにアクセスを許可します
