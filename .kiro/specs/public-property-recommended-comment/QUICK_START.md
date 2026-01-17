# おすすめコメント表示機能 - クイックスタートガイド

## 概要

公開物件詳細ページに表示される「おすすめコメント」機能のクイックスタートガイドです。

## 前提条件

- Node.js 18以上
- 業務リストスプレッドシートへのアクセス権限
- Googleサービスアカウントの設定完了

## セットアップ

### 1. 環境変数の設定

`.env`ファイルに以下を追加：

```bash
# 業務リストスプレッドシートID
GYOMU_LIST_SPREADSHEET_ID=your_spreadsheet_id_here

# Googleサービスアカウントキーのパス
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./path/to/service-account-key.json
```

### 2. 依存関係のインストール

```bash
# バックエンド
cd backend
npm install

# フロントエンド
cd ../frontend
npm install
```

### 3. 開発サーバーの起動

```bash
# ルートディレクトリから
npm run dev
```

または

```bash
# Windowsの場合
start-dev.bat
```

## 使用方法

### 公開物件詳細ページでの表示

1. ブラウザで公開物件詳細ページにアクセス
   ```
   http://localhost:5173/public/properties/{property-id}
   ```

2. 画像ギャラリーの下に「おすすめポイント」セクションが表示されます

3. コメントがない物件では、セクションは表示されません

### APIの直接呼び出し

```bash
# コメントを取得
curl http://localhost:3000/api/public/properties/{property-id}/recommended-comment
```

レスポンス例：
```json
{
  "comment": "この物件は日当たりが良く、閑静な住宅街にあります。",
  "propertyType": "土地"
}
```

## テスト実行

### バックエンドテスト

```bash
cd backend
npm test -- RecommendedCommentService.test.ts
```

### フロントエンドテスト

```bash
cd frontend
npm test -- RecommendedCommentSection.test.tsx
```

### 全テスト実行

```bash
# バックエンド
cd backend
npm test

# フロントエンド
cd frontend
npm test
```

## トラブルシューティング

### コメントが表示されない

1. **スプレッドシートIDの確認**
   ```bash
   echo $GYOMU_LIST_SPREADSHEET_ID
   ```

2. **サービスアカウントキーの確認**
   ```bash
   # ファイルが存在するか確認
   ls -la ./path/to/service-account-key.json
   ```

3. **ブラウザのコンソールを確認**
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーメッセージを確認

4. **バックエンドのログを確認**
   ```bash
   # バックエンドのターミナルでエラーログを確認
   ```

### 認証エラー

1. **サービスアカウントの権限確認**
   - スプレッドシートの共有設定でサービスアカウントのメールアドレスが追加されているか確認
   - 閲覧権限以上が付与されているか確認

2. **環境変数の再読み込み**
   ```bash
   # 開発サーバーを再起動
   npm run dev
   ```

### セル位置が間違っている

現在のセル位置マッピング：
- 土地: B53
- 戸建て: B142
- マンション: B150

変更が必要な場合は、`backend/src/services/RecommendedCommentService.ts`の`getCellPosition`メソッドを編集してください。

## よくある質問

### Q: コメントはどのくらいの頻度で更新されますか？

A: フロントエンドとバックエンドの両方で5分間キャッシュされます。最新のコメントを確認するには、ブラウザをリフレッシュしてください。

### Q: 複数行のコメントは表示できますか？

A: はい、改行を含むコメントは正しく表示されます。スプレッドシートで改行を入力すると、そのまま表示されます。

### Q: コメントの最大文字数は？

A: 現在、文字数制限はありません。ただし、読みやすさを考慮して500文字程度を推奨します。

### Q: 画像をコメントに含めることはできますか？

A: 現在はテキストのみ対応しています。画像対応は今後の改善案として検討中です。

## 次のステップ

1. [要件定義書](./requirements.md)で詳細な仕様を確認
2. [設計書](./design.md)でアーキテクチャを理解
3. [実装完了報告](./IMPLEMENTATION_COMPLETE.md)で実装内容を確認

## サポート

問題が解決しない場合は、以下を確認してください：

1. エラーログの内容
2. 環境変数の設定
3. スプレッドシートの構造
4. サービスアカウントの権限

## 関連リンク

- [Google Sheets API ドキュメント](https://developers.google.com/sheets/api)
- [React Query ドキュメント](https://tanstack.com/query/latest)
- [Material-UI ドキュメント](https://mui.com/)
