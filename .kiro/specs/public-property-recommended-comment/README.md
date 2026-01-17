# おすすめコメント表示機能

公開物件詳細ページに、業務リストスプレッドシートから取得した「おすすめコメント」を表示する機能です。

## 機能概要

- 物件タイプ（土地/戸建て/マンション）に応じて、スプレッドシートの特定セルからコメントを取得
- 公開物件詳細ページの画像ギャラリーの下に表示
- コメントがない場合は非表示
- エラー時もページ全体の表示に影響しない

## ドキュメント

- [要件定義書](./requirements.md) - 機能の詳細な要件
- [設計書](./design.md) - アーキテクチャと技術仕様
- [タスクリスト](./tasks.md) - 実装タスクの一覧
- [クイックスタートガイド](./QUICK_START.md) - セットアップと使用方法
- [実装完了報告](./IMPLEMENTATION_COMPLETE.md) - 実装内容の詳細

## クイックスタート

```bash
# 環境変数を設定
export GYOMU_LIST_SPREADSHEET_ID=your_spreadsheet_id
export GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./service-account-key.json

# 開発サーバーを起動
npm run dev
```

詳細は[クイックスタートガイド](./QUICK_START.md)を参照してください。

## 技術スタック

### バックエンド
- Node.js + Express
- TypeScript
- Google Sheets API
- Jest（テスト）

### フロントエンド
- React + TypeScript
- Material-UI
- React Query
- Jest + React Testing Library（テスト）

## データソース

### スプレッドシート構造

- **スプレッドシート**: 業務リスト
- **シート名**: athome
- **物件ごとのシート**: 物件番号（例: AA12345）

### セル位置

| 物件タイプ | セル位置 |
|-----------|---------|
| 土地 | B53 |
| 戸建て | B142 |
| マンション | B150 |

## API仕様

### エンドポイント

```
GET /api/public/properties/:id/recommended-comment
```

### レスポンス

```json
{
  "comment": "この物件は日当たりが良く、閑静な住宅街にあります。",
  "propertyType": "土地"
}
```

### エラーレスポンス

```json
{
  "error": "Property not found or not publicly available"
}
```

## 実装ファイル

### バックエンド

- `backend/src/services/RecommendedCommentService.ts` - コメント取得サービス
- `backend/src/routes/publicProperties.ts` - APIルート
- `backend/src/services/__tests__/RecommendedCommentService.test.ts` - ユニットテスト

### フロントエンド

- `frontend/src/components/RecommendedCommentSection.tsx` - 表示コンポーネント
- `frontend/src/pages/PublicPropertyDetailPage.tsx` - 詳細ページ
- `frontend/src/components/__tests__/RecommendedCommentSection.test.tsx` - コンポーネントテスト

## テスト

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

## デプロイ

1. 環境変数を本番環境に設定
2. バックエンドをデプロイ
3. フロントエンドをデプロイ
4. 動作確認

詳細は[実装完了報告](./IMPLEMENTATION_COMPLETE.md)を参照してください。

## トラブルシューティング

### コメントが表示されない

1. スプレッドシートIDが正しいか確認
2. サービスアカウントの権限を確認
3. 物件番号に対応するシートが存在するか確認
4. ブラウザのコンソールでエラーを確認

詳細は[クイックスタートガイド](./QUICK_START.md)のトラブルシューティングセクションを参照してください。

## 今後の改善案

1. 管理画面でのコメント編集機能
2. 多言語対応
3. リッチテキスト対応
4. 画像埋め込み対応
5. コメント履歴管理
6. セル位置の動的設定

## ライセンス

このプロジェクトは社内用です。

## 貢献

バグ報告や機能要望は、プロジェクトの課題管理システムに登録してください。

## サポート

技術的な質問や問題は、開発チームに連絡してください。
