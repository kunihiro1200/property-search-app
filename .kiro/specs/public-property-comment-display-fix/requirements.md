# 公開物件サイト - コメント表示修正

## 📋 概要

公開物件サイトの本番環境で、物件詳細ページのコメント（お気に入り、オススメ、内覧前）が表示されない問題を修正します。

## 🎯 目標

AA5564などの物件で、以下のコメントデータが正しく表示されるようにする：
- お気に入り文言（favorite_comment）
- オススメコメント（recommended_comments）
- 内覧前コメント（viewing_notes）

## 📊 現状分析

### 問題の症状
- **本番環境**（https://property-site-frontend-kappa.vercel.app）でコメントが表示されない
- AA5564の`property_details`テーブルを確認したところ：
  - `favorite_comment`: NULL
  - `recommended_comments`: [] (空配列)
  - `athome_data`: [] (空配列)
  - `property_about`: 正常に表示

### 原因の仮説
1. **Google Sheets APIクォータ制限**: 自動同期が失敗している可能性
2. **Vercelデプロイ時の環境変数**: 環境変数が正しく設定されていない可能性
3. **`/complete`エンドポイントの自動同期ロジック**: 本番環境で動作していない可能性

### 以前の動作状況
- 以前は正常に動作していた（ユーザー証言）
- コミット履歴を確認すると、`/complete`エンドポイントに自動同期ロジックが実装されている

## ✅ 受入基準

### 1. コメントデータの表示
- [ ] AA5564の物件詳細ページで「お気に入り文言」が表示される
- [ ] AA5564の物件詳細ページで「オススメコメント」が表示される
- [ ] AA5564の物件詳細ページで「内覧前コメント」が表示される

### 2. 自動同期の動作確認
- [ ] `/complete`エンドポイントでコメントデータが空の場合、Athomeシートから自動同期される
- [ ] 自動同期が成功した場合、`property_details`テーブルが更新される
- [ ] 自動同期が失敗した場合、エラーログが出力される

### 3. 本番環境での動作確認
- [ ] 本番環境（Vercel）でコメントデータが正しく表示される
- [ ] Google Sheets APIクォータ制限に達した場合でも、既存のデータが表示される
- [ ] 環境変数が正しく設定されている

## 🔍 調査項目

### 1. Vercelログの確認
- [ ] `/complete`エンドポイントのログを確認
- [ ] 自動同期が実行されているか確認
- [ ] エラーが発生しているか確認

### 2. 環境変数の確認
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON`が設定されているか
- [ ] `GOOGLE_SHEETS_SPREADSHEET_ID`が設定されているか
- [ ] その他の必要な環境変数が設定されているか

### 3. データベースの確認
- [ ] `property_details`テーブルのデータを確認
- [ ] `property_listings`テーブルのデータを確認
- [ ] 他の物件（AA5564以外）のコメントデータも確認

## 📝 関連ファイル

- `backend/api/index.ts` - `/complete`エンドポイント
- `backend/src/services/PropertyDetailsService.ts` - コメントデータ取得
- `backend/src/services/AthomeSheetSyncService.ts` - Athomeシート同期
- `frontend/src/pages/PublicPropertyDetailPage.tsx` - フロントエンド表示

## 🚨 制約事項

- Google Sheets APIクォータ制限: 1分あたり60リクエスト
- Vercelの実行時間制限: 10秒（Hobby plan）
- 売主リスト関連のファイルは変更しない（システム隔離ルール）

## 📅 優先度

**高**: 本番環境で顧客に影響が出ている

## 🎓 参考情報

### 過去の関連コミット
- `e86aa07`: PanoramaUrlServiceを削除してathome_dataから取得
- `1a6719c`: 動作していたバージョン（静的インポート使用）
- `9405333`: 動的インポート使用

### ステアリングドキュメント
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- `.kiro/steering/git-history-first-approach.md` - Git履歴優先アプローチ
