# フロントエンドデバッグ手順

## 画面が真っ白な場合の確認手順

### 1. ブラウザのコンソールを開く

1. ブラウザで http://localhost:5173/login を開く
2. **F12キー** を押す（または右クリック → 検証）
3. **Console** タブを選択
4. エラーメッセージを確認

### 2. よくあるエラーと解決策

#### エラー: "Missing Supabase environment variables"

**原因**: 環境変数が読み込まれていない

**解決策**:
```bash
# フロントエンドを再起動
cd frontend
# Ctrl+C でサーバーを停止
npm run dev
```

#### エラー: "Failed to fetch" または "Network Error"

**原因**: バックエンドが起動していない

**解決策**:
```bash
# バックエンドを起動
cd backend
npm run dev
```

#### エラー: "Invalid API key" または "401 Unauthorized"

**原因**: Supabase の設定が間違っている

**解決策**:
1. `frontend/.env` ファイルを確認
2. `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY` が正しいか確認

### 3. ネットワークタブを確認

1. ブラウザのDevToolsで **Network** タブを選択
2. ページをリロード（F5キー）
3. 赤色（エラー）のリクエストがないか確認
4. エラーがある場合、そのリクエストをクリックして詳細を確認

### 4. 現在の設定値

```
フロントエンドURL: http://localhost:5173
バックエンドURL: http://localhost:3000
Supabase URL: https://krxhrbtlgfjzsseegaqq.supabase.co
```

### 5. サーバーの状態確認

#### フロントエンドが起動しているか確認
```bash
# ブラウザで以下にアクセス
http://localhost:5173
```

#### バックエンドが起動しているか確認
```bash
# ブラウザで以下にアクセス
http://localhost:3000/health
```

### 6. キャッシュクリア

ブラウザのキャッシュが原因の場合：

1. **Ctrl + Shift + Delete** を押す
2. **キャッシュされた画像とファイル** を選択
3. **データを削除** をクリック
4. ページをリロード

または：

1. **Ctrl + Shift + R** で強制リロード

### 7. 完全リセット

それでも解決しない場合：

```bash
# フロントエンドを停止（Ctrl+C）

# Viteのキャッシュを削除
cd frontend
Remove-Item -Recurse -Force node_modules\.vite

# 再起動
npm run dev
```

---

## 📸 スクリーンショットを撮る場合

以下の情報があると問題解決に役立ちます：

1. ブラウザのコンソール（Console タブ）
2. ネットワークタブ（Network タブ）
3. 画面全体のスクリーンショット

---

## 🔍 現在確認すべきこと

### ステップ1: ブラウザのコンソールを開く
- F12キーを押す
- Console タブを選択
- **エラーメッセージをコピーしてください**

### ステップ2: ネットワークタブを確認
- Network タブを選択
- ページをリロード（F5）
- **赤色のリクエストがあればクリックして詳細を確認**

### ステップ3: 以下のURLに直接アクセス
- http://localhost:5173 （フロントエンド）
- http://localhost:3000/health （バックエンド）

**どちらかがアクセスできない場合、そのサーバーが起動していません**
