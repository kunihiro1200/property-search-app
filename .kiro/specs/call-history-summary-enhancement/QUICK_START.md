# 🚀 クイックスタートガイド

## 5分で始める通話履歴サマリー機能

このガイドでは、最も簡単な方法で通話履歴サマリー機能をテストする方法を説明します。

## ステップ1: サーバー起動（30秒）

```bash
cd backend
npm run dev
```

サーバーが `http://localhost:3000` で起動します。

## ステップ2: 簡単なテスト（1分）

### オプションA: curlでテスト

```bash
# 認証トークンを取得（実際のメールアドレスとパスワードを使用）
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your-email@example.com","password":"your-password"}' \
  | jq -r '.token')

# サマリーを生成
curl -X POST http://localhost:3000/api/summarize/call-memos \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "memos": [
      "3/2 12:00 訪問査定の日程調整を行った",
      "2/28 15:30 物件情報のヒアリング完了",
      "2/25 10:00 初回コンタクト、興味あり"
    ]
  }' | jq
```

### オプションB: Postmanでテスト

1. **POST** `http://localhost:3000/api/auth/login`
   - Body: `{"email":"your-email","password":"your-password"}`
   - トークンをコピー

2. **POST** `http://localhost:3000/api/summarize/call-memos`
   - Headers: `Authorization: Bearer YOUR_TOKEN`
   - Body:
   ```json
   {
     "memos": [
       "3/2 12:00 訪問査定の日程調整を行った",
       "2/28 15:30 物件情報のヒアリング完了",
       "2/25 10:00 初回コンタクト、興味あり"
     ]
   }
   ```

### オプションC: ブラウザの開発者ツールでテスト

1. ブラウザでアプリケーションにログイン
2. 開発者ツールを開く（F12）
3. コンソールで以下を実行:

```javascript
// サマリーを生成
fetch('/api/summarize/call-memos', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  },
  body: JSON.stringify({
    memos: [
      '3/2 12:00 訪問査定の日程調整を行った',
      '2/28 15:30 物件情報のヒアリング完了',
      '2/25 10:00 初回コンタクト、興味あり'
    ]
  })
})
.then(r => r.json())
.then(data => console.log(data.summary));
```

## ステップ3: 結果を確認（1分）

期待される出力:

```
【次のアクション】訪問査定の日程調整を行う
【通話回数】3回
【状況】訪問査定の日程調整を行った、物件情報のヒアリング完了、初回コンタクト、興味あり
```

## ステップ4: 実際の売主データでテスト（2分）

```bash
# 売主リストを取得
curl -X GET http://localhost:3000/api/sellers \
  -H "Authorization: Bearer $TOKEN" | jq

# 売主IDをコピーして、サマリーを生成
curl -X GET http://localhost:3000/api/summarize/seller/SELLER_ID \
  -H "Authorization: Bearer $TOKEN" | jq
```

## よくある質問

### Q: トークンが取得できない
**A**: メールアドレスとパスワードが正しいか確認してください。

### Q: サマリーが生成されない
**A**: サーバーのログを確認してください。エラーメッセージが表示されているはずです。

### Q: 通話回数が0回になる
**A**: タイムスタンプのフォーマットを確認してください。`M/D HH:mm` 形式（例: `3/2 12:00`）である必要があります。

### Q: 日本語が文字化けする
**A**: リクエストヘッダーに `Content-Type: application/json; charset=utf-8` を追加してください。

## 次のステップ

✅ 基本的なテストが成功したら:
1. `MANUAL_TESTING_GUIDE.md` で詳細なテストを実施
2. 実際の本番データでテスト
3. 品質を確認して調整

## トラブルシューティング

### サーバーが起動しない
```bash
# 依存関係をインストール
cd backend
npm install

# ポート3000が使用中の場合
# backend/.env で PORT を変更
```

### データベース接続エラー
```bash
# .env ファイルを確認
cat backend/.env

# DATABASE_URL が正しいか確認
```

### 認証エラー
```bash
# ユーザーが存在するか確認
# または新しいユーザーを作成
```

## サポート

問題が解決しない場合:
1. `MANUAL_TESTING_GUIDE.md` のトラブルシューティングセクションを確認
2. `IMPLEMENTATION_SUMMARY.md` で技術的な詳細を確認
3. サーバーログを確認: `backend/logs/`

## まとめ

このクイックスタートガイドで、5分以内に通話履歴サマリー機能をテストできます。

**成功したら**: 次は `MANUAL_TESTING_GUIDE.md` で詳細なテストを実施してください。

**問題がある場合**: トラブルシューティングセクションを確認するか、ドキュメントを参照してください。
