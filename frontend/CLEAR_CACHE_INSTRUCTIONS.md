# ローカル環境ログイン問題の解決手順

## 問題
ブラウザが本番環境のバックエンド（`https://baikyaku-property-site3.vercel.app`）にリクエストを送信している。
ローカル環境（`http://localhost:3000`）に接続する必要がある。

## 解決手順

### 1. ブラウザのキャッシュとCookieを完全にクリア

#### Chrome / Edge の場合:
1. `Ctrl + Shift + Delete` を押す
2. 「期間」を **「全期間」** に設定
3. 以下をすべてチェック:
   - ✅ 閲覧履歴
   - ✅ Cookieと他のサイトデータ
   - ✅ キャッシュされた画像とファイル
   - ✅ サイトの設定
   - ✅ ホストされているアプリのデータ
4. 「データを削除」をクリック
5. **ブラウザを完全に閉じる**（すべてのウィンドウを閉じる）

#### Firefox の場合:
1. `Ctrl + Shift + Delete` を押す
2. 「消去する履歴の期間」を **「すべての履歴」** に設定
3. 以下をすべてチェック:
   - ✅ 表示したページとダウンロードの履歴
   - ✅ Cookie
   - ✅ キャッシュ
   - ✅ サイトの設定
4. 「今すぐ消去」をクリック
5. **ブラウザを完全に閉じる**

### 2. ローカルストレージを手動でクリア（念のため）

1. ブラウザを開く
2. `F12` を押して開発者ツールを開く
3. 「Application」タブ（Chromeの場合）または「ストレージ」タブ（Firefoxの場合）を開く
4. 左側の「Local Storage」を展開
5. `http://localhost:5174` を右クリック → 「Clear」
6. 「Session Storage」も同様にクリア
7. 「Cookies」も同様にクリア

### 3. フロントエンドを再起動

```bash
cd frontend
npm run dev
```

### 4. 新しいブラウザウィンドウでアクセス

1. **新しいブラウザウィンドウ**を開く（既存のウィンドウは使わない）
2. `http://localhost:5174/login` にアクセス
3. 「Googleでログイン」をクリック

### 5. それでもダメな場合

#### A. 別のブラウザで試す
- Chrome → Edge または Firefox
- Edge → Chrome または Firefox
- Firefox → Chrome または Edge

#### B. シークレットモード/プライベートブラウジングで試す
- Chrome: `Ctrl + Shift + N`
- Edge: `Ctrl + Shift + N`
- Firefox: `Ctrl + Shift + P`

#### C. フロントエンドを完全にクリーンビルド

```bash
cd frontend

# node_modulesを削除
rmdir /s /q node_modules

# キャッシュを削除
rmdir /s /q .vite
rmdir /s /q dist

# 再インストール
npm install

# 再起動
npm run dev
```

### 6. 確認方法

ログインページ（`http://localhost:5174/login`）で:
1. `F12` を押して開発者ツールを開く
2. 「Network」タブを開く
3. 「Googleでログイン」をクリック
4. ネットワークリクエストを確認:
   - ✅ `http://localhost:3000/auth/callback` にリクエストが送信される
   - ❌ `https://baikyaku-property-site3.vercel.app` にリクエストが送信される場合は、まだキャッシュが残っている

## 重要なポイント

- **ブラウザを完全に閉じる**: タブを閉じるだけでは不十分。すべてのウィンドウを閉じる
- **新しいウィンドウで開く**: 既存のウィンドウは古いキャッシュを持っている可能性がある
- **シークレットモードを試す**: 最もクリーンな環境でテストできる

## トラブルシューティング

### 「404 Not Found」エラーが出る場合
- バックエンドが起動しているか確認: `http://localhost:3000/health`
- フロントエンドが起動しているか確認: `http://localhost:5174`

### 「CORS」エラーが出る場合
- `backend/.env` の `FRONTEND_URL` を確認:
  ```
  FRONTEND_URL=http://localhost:5173,http://localhost:5174
  ```

### 環境変数が読み込まれない場合
- フロントエンドを再起動
- ブラウザのコンソールで確認:
  ```javascript
  console.log(import.meta.env.VITE_API_URL)
  // 出力: http://localhost:3000
  ```
