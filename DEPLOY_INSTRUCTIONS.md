# フロントエンドデプロイ手順

## 🚀 デプロイ方法

### 方法1: バッチファイルを使用（最も簡単）

1. ルートディレクトリで以下のコマンドを実行：
   ```
   deploy-to-vercel.bat
   ```

2. Vercelにログインしていない場合、ブラウザが開いてログインを求められます

3. デプロイが完了するまで待ちます（通常1-3分）

4. デプロイ完了後、以下のURLで確認：
   - 本番URL: https://baikyaku-property-site3.vercel.app
   - AA9743の確認: https://baikyaku-property-site3.vercel.app/public/properties/AA9743

### 方法2: 手動でデプロイ

1. フロントエンドディレクトリに移動：
   ```
   cd frontend
   ```

2. Vercelにデプロイ：
   ```
   npx vercel --prod
   ```

3. プロンプトに従って進めます

## ✅ デプロイ後の確認

1. **公開物件一覧ページ**:
   - https://baikyaku-property-site3.vercel.app/public/properties
   - AA9743が一覧に表示されることを確認

2. **AA9743詳細ページ**:
   - https://baikyaku-property-site3.vercel.app/public/properties/AA9743
   - 物件詳細が正しく表示されることを確認
   - 画像が11枚表示されることを確認

3. **ブラウザのコンソールエラー確認**:
   - F12キーを押して開発者ツールを開く
   - Consoleタブでエラーがないか確認

## 🔧 トラブルシューティング

### デプロイが失敗する場合

1. **Vercelにログインしているか確認**:
   ```
   npx vercel whoami
   ```

2. **ビルドエラーが出る場合**:
   ```
   cd frontend
   npm run build
   ```
   - エラーメッセージを確認して修正

3. **環境変数が設定されているか確認**:
   - Vercelダッシュボード: https://vercel.com/dashboard
   - プロジェクト設定 → Environment Variables

### AA9743が表示されない場合

1. **ブラウザのキャッシュをクリア**:
   - Ctrl + Shift + Delete
   - キャッシュをクリア

2. **APIが正常に動作しているか確認**:
   ```
   npx ts-node backend/check-aa9743-production-api.ts
   ```

3. **データベースの状態を確認**:
   ```
   npx ts-node backend/check-aa9743-public-site.ts
   ```

## 📝 今回の修正内容

- `isPropertyClickable`関数を追加（`frontend/src/utils/propertyStatusUtils.ts`）
- `PublicPropertyCard.tsx`で正しくインポート

これにより、AA9743が正常に表示されるようになります。
