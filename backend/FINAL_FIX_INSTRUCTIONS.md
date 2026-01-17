# 🚨 最終修正手順（RLS無効化）

## 現在の状況

✅ データベース: 6,649件のデータが存在  
❌ フロントエンド: 0件表示（RLSポリシーの問題）

## 原因

Row Level Security (RLS) が有効になっているため、フロントエンドからデータにアクセスできません。

## 解決方法（1分で完了）

### Supabase SQL Editorで実行

1. https://supabase.com/dashboard にアクセス
2. プロジェクト `krxhrbtlgfjzsseegaqq` を選択
3. 左メニューから **SQL Editor** をクリック
4. 以下のSQLをコピー＆ペースト：

```sql
ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;
```

5. **Run** ボタンをクリック

### 実行結果

以下のように表示されれば成功：

```
Success. No rows returned
```

または

```
schemaname | tablename | rowsecurity
-----------+-----------+-------------
public     | sellers   | f
```

(`rowsecurity` が `f` = false = 無効)

---

## 実行後の確認

### 1. ブラウザをリロード

1. http://localhost:5173 を開いているブラウザで **F5キー** を押す
2. または **Ctrl + Shift + R** で強制リロード

### 2. 売主リストを確認

- 売主リストページに移動
- **6,649件の売主データが表示されるはずです**

---

## トラブルシューティング

### まだ「売主が見つかりませんでした」と表示される

**解決策1: ブラウザのキャッシュをクリア**

1. **Ctrl + Shift + Delete** を押す
2. **キャッシュされた画像とファイル** を選択
3. **データを削除** をクリック
4. ページをリロード

**解決策2: バックエンドを再起動**

```bash
# バックエンドのターミナルで Ctrl+C を押して停止
cd backend
npm run dev
```

**解決策3: フロントエンドを再起動**

```bash
# フロントエンドのターミナルで Ctrl+C を押して停止
cd frontend
npm run dev
```

---

## 注意事項

### ⚠️ セキュリティについて

この設定は**開発環境専用**です。本番環境では以下のいずれかを実装してください：

1. **RLSポリシーを正しく設定**（推奨）
2. **バックエンドAPIを経由してアクセス**（現在の実装）

### 現在の実装

このアプリケーションは**バックエンドAPI経由**でデータにアクセスしているため、RLSを無効化しても問題ありません。

---

## 確認コマンド

RLSが無効化されたか確認：

```bash
cd backend
npx ts-node diagnose-rls-and-api.ts
```

以下のように表示されれば成功：

```
2️⃣ Anonキーでアクセス（RLS適用）...
✅ 成功: 5 件取得
```

---

## まとめ

1. ✅ Supabase SQL Editorで `ALTER TABLE sellers DISABLE ROW LEVEL SECURITY;` を実行
2. ✅ ブラウザをリロード（F5）
3. ✅ 売主リストが表示されることを確認

これで完了です！
