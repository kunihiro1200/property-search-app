# Vercelデプロイ分離 - タスクリスト

## Phase 1: 準備とスクリプト作成

### 1.1 scriptsディレクトリの作成
- [ ] `scripts/`ディレクトリを作成

### 1.2 管理画面用スクリプトの作成
- [ ] `scripts/should-deploy-admin.sh`を作成
  - [ ] 前回のデプロイから変更されたファイルを取得するロジック
  - [ ] 公開サイト専用ファイルのパターンを定義
  - [ ] 公開サイト専用ファイルのみが変更された場合はデプロイをスキップ
  - [ ] それ以外の場合はデプロイを実行
  - [ ] 実行権限を付与（`chmod +x`）

### 1.3 公開サイト用スクリプトの作成
- [ ] `scripts/should-deploy-public.sh`を作成
  - [ ] 前回のデプロイから変更されたファイルを取得するロジック
  - [ ] 管理画面専用ファイルのパターンを定義
  - [ ] 管理画面専用ファイルのみが変更された場合はデプロイをスキップ
  - [ ] それ以外の場合はデプロイを実行
  - [ ] 実行権限を付与（`chmod +x`）

### 1.4 スクリプトのローカルテスト
- [ ] 管理画面専用ファイルを変更してスクリプトをテスト
- [ ] 公開サイト専用ファイルを変更してスクリプトをテスト
- [ ] 共通ファイルを変更してスクリプトをテスト

---

## Phase 2: Vercel設定の適用

### 2.1 管理画面プロジェクト（frontend）の設定
- [ ] Vercel Dashboardにログイン
- [ ] `frontend`プロジェクトを選択
- [ ] Settings → Git に移動
- [ ] Ignored Build Stepに`bash scripts/should-deploy-admin.sh`を設定
- [ ] 設定を保存

### 2.2 公開サイトプロジェクト（property-site-frontend）の設定
- [ ] Vercel Dashboardにログイン
- [ ] `property-site-frontend`プロジェクトを選択
- [ ] Settings → Git に移動
- [ ] Ignored Build Stepに`bash scripts/should-deploy-public.sh`を設定
- [ ] 設定を保存

---

## Phase 3: テストと検証

### 3.1 管理画面専用ファイルのテスト
- [ ] `SellerListPage.tsx`を変更してコミット
- [ ] `frontend`プロジェクトがデプロイされることを確認
- [ ] `property-site-frontend`プロジェクトがスキップされることを確認
- [ ] デプロイログを確認

### 3.2 公開サイト専用ファイルのテスト
- [ ] `PublicPropertyListPage.tsx`を変更してコミット
- [ ] `property-site-frontend`プロジェクトがデプロイされることを確認
- [ ] `frontend`プロジェクトがスキップされることを確認
- [ ] デプロイログを確認

### 3.3 共通ファイルのテスト
- [ ] `frontend/src/utils/api.ts`を変更してコミット
- [ ] 両方のプロジェクトがデプロイされることを確認
- [ ] デプロイログを確認

### 3.4 機能テスト
- [ ] 管理画面の全ての機能が正常に動作することを確認
  - [ ] 売主リスト
  - [ ] 物件リスト
  - [ ] 買主リスト
  - [ ] 業務リスト
- [ ] 公開サイトの全ての機能が正常に動作することを確認
  - [ ] 公開物件一覧
  - [ ] 公開物件詳細
  - [ ] 検索機能
  - [ ] フィルタ機能

### 3.5 後方互換性テスト
- [ ] 既存のURLが全て動作することを確認
  - [ ] `https://property-site-frontend-kappa.vercel.app/public/properties/AA5030`
  - [ ] `https://property-site-frontend-kappa.vercel.app/public/properties?propertyNumber=AA5030`
  - [ ] 管理画面のURL
- [ ] APIエンドポイントが全て動作することを確認
  - [ ] `/api/sellers`
  - [ ] `/api/properties`
  - [ ] `/api/buyers`
  - [ ] `/api/public/properties`

---

## Phase 4: ドキュメント作成

### 4.1 README更新
- [ ] `scripts/README.md`を作成
  - [ ] スクリプトの目的を説明
  - [ ] 使用方法を説明
  - [ ] トラブルシューティングを記載

### 4.2 デプロイガイド更新
- [ ] デプロイフローを文書化
- [ ] 新しいページを追加する際の手順を記載

---

## Phase 5: モニタリングと最適化

### 5.1 デプロイ統計の収集
- [ ] デプロイ回数を記録（プロジェクトごと）
- [ ] スキップされたデプロイ回数を記録
- [ ] デプロイ時間を記録

### 5.2 スクリプトの最適化
- [ ] デプロイ統計を分析
- [ ] スクリプトのロジックを改善（必要に応じて）
- [ ] ファイルパターンを更新（必要に応じて）

---

## 完了条件

- [ ] 全てのテストケースが成功
- [ ] 管理画面の全ての機能が正常に動作
- [ ] 公開サイトの全ての機能が正常に動作
- [ ] 既存のURLが全て動作
- [ ] デプロイ時間が50%削減
- [ ] ドキュメントが完成

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: Ready for Implementation
