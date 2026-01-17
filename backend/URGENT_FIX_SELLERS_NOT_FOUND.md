# 🚨 緊急修正: 「売主が見つかりませんでした」エラー

## 現在の状況

✅ **データベース**: 6,649件の売主データが存在  
✅ **バックエンド**: 正常に起動中  
✅ **フロントエンド**: 正常に起動中  
❌ **問題**: 売主データが表示されない

## 原因

**Row Level Security (RLS)** ポリシーが設定されていないため、認証済みユーザーでもデータにアクセスできません。

## 解決方法（2つの選択肢）

### 🎯 方法1: RLSポリシーを設定（推奨）

#### ステップ1: Supabase SQL Editorを開く

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `krxhrbtlgfjzsseegaqq` を選択
3. 左メニューから **SQL Editor** をクリック

#### ステップ2: 以下のSQLを実行

```sql
-- 既存のポリシーを削除
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable update for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable delete for authenticated users" ON sellers;
DROP POLICY IF EXISTS "Enable all access for service role" ON sellers;

-- 認証済みユーザーに対して全アクセスを許可
CREATE POLICY "Enable read access for authenticated users"
ON sellers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert for authenticated users"
ON sellers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users"
ON sellers FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users"
ON sellers FOR DELETE
TO authenticated
USING (true);

-- サービスロールに対しても全アクセスを許可
CREATE POLICY "Enable all access for service role"
ON sellers FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### ステップ3: 実行

**Run** ボタンをクリック

---

### 🎯 方法2: RLSを一時的に無効化（開発環境のみ）

⚠️ **注意**: 本番環境では使用しないでください

#### Supabase SQL Editorで実行:

```sql
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
```

---

## 実行後の確認

### 1. ブラウザで確認

1. http://localhost:5173/login にアクセス
2. **Googleでログイン** ボタンをクリック
3. Googleアカウントを選択
4. 認証完了後、売主リストが表示されることを確認

### 2. APIテスト（オプション）

```bash
cd backend
npx ts-node check-sellers-api.ts
```

---

## よくある質問

### Q: SQLを実行したのにまだエラーが出る

**A**: 以下を確認してください：
1. ブラウザのキャッシュをクリア（Ctrl + Shift + Delete）
2. ページをリロード（F5）
3. ログアウトして再度ログイン

### Q: Googleログインができない

**A**: 以下を確認してください：
1. Supabase DashboardでGoogle Providerが有効になっているか
2. Client IDとClient Secretが正しく設定されているか
3. Redirect URIが正しく設定されているか

### Q: "No authentication token provided" エラー

**A**: ログインしていません：
1. http://localhost:5173/login でログイン
2. 認証完了後に再度アクセス

---

## 次のステップ

1. ✅ 上記のSQLを実行
2. ✅ ブラウザでログイン
3. ✅ 売主リストが表示されることを確認

---

## サポート

問題が解決しない場合：

1. ブラウザのコンソール（F12）でエラーを確認
2. バックエンドのログでエラーを確認
3. Supabase Dashboardの Logs でエラーを確認
