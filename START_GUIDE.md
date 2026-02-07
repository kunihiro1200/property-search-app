# 開発サーバー起動ガイド

## 🚀 クイックスタート

### 1. 全てのサーバーを起動

```bash
start-all.bat
```

このスクリプトは以下を自動的に実行します：
- バックエンドをポート3000で起動
- フロントエンドをポート5173（または5174）で起動

### 2. サーバーの状態を確認

```bash
check-status.bat
```

このスクリプトは以下を確認します：
- バックエンド（ポート3000）が起動しているか
- フロントエンド（ポート5173/5174）が起動しているか

### 3. 全てのサーバーを停止

```bash
stop-all.bat
```

このスクリプトは以下を停止します：
- バックエンド（ポート3000）
- フロントエンド（ポート5173/5174）

---

## 📋 手動起動（トラブルシューティング用）

### バックエンドのみ起動

```bash
cd backend
npm run dev
```

バックエンドは`http://localhost:3000`で起動します。

### フロントエンドのみ起動

```bash
cd frontend
npm run dev
```

フロントエンドは`http://localhost:5173`（または5174）で起動します。

---

## 🔧 トラブルシューティング

### ポートが既に使用されている場合

**エラー**: `EADDRINUSE: address already in use :::3000`

**解決方法**:
1. `stop-all.bat`を実行して全てのサーバーを停止
2. `check-status.bat`で停止を確認
3. `start-all.bat`で再起動

### フロントエンドがバックエンドに接続できない場合

**症状**: 
- ブラウザで「Network Error」が表示される
- APIリクエストが失敗する

**確認事項**:
1. `check-status.bat`でバックエンドが起動しているか確認
2. ブラウザのコンソールで接続先URLを確認（`http://localhost:3000`であるべき）
3. `frontend/.env`ファイルで`VITE_API_URL=http://localhost:3000`が設定されているか確認

**解決方法**:
1. バックエンドが起動していない場合は`start-all.bat`で起動
2. 環境変数が間違っている場合は修正して、フロントエンドを再起動

---

## 📝 環境変数の確認

### バックエンド（`backend/.env`）

```properties
PORT=3000
NODE_ENV=development
GMAIL_CLIENT_ID=...
GMAIL_CLIENT_SECRET=...
GMAIL_REFRESH_TOKEN=...
```

### フロントエンド（`frontend/.env`）

```properties
VITE_API_URL=http://localhost:3000
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

---

## 🎯 よくある質問

### Q: バックエンドとフロントエンドを同時に起動できますか？

A: はい、`start-all.bat`を実行すると両方が自動的に起動します。

### Q: ポート番号を変更できますか？

A: はい、以下のファイルを編集してください：
- バックエンド: `backend/.env`の`PORT`
- フロントエンド: `frontend/.env`の`VITE_API_URL`

### Q: 起動に失敗した場合はどうすればいいですか？

A: 以下の手順を試してください：
1. `stop-all.bat`で全てのサーバーを停止
2. `check-status.bat`で停止を確認
3. `start-all.bat`で再起動
4. それでも失敗する場合は、手動で起動してエラーメッセージを確認

---

**最終更新日**: 2026年2月7日  
**作成理由**: 開発サーバーの起動を自動化し、ポート接続エラーを防ぐため
