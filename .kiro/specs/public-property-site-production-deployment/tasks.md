# Implementation Plan: 公開物件サイト本番環境移行

## Overview

このタスクリストは、既に開発が完了している公開物件サイトをVercelにデプロイし、本番環境で運用開始するための実装タスクを定義します。Vercel設定、環境変数、SEO最適化、パフォーマンス最適化、セキュリティ設定を含みます。

## Tasks

- [ ] 1. Vercelデプロイ設定
  - [x] 1.1 vercel.jsonの作成・更新
    - フロントエンドとバックエンドの統合ビルド設定を追加
    - ルーティング設定（/api/* → バックエンド、/* → フロントエンド）
    - ビルドコマンドの設定
    - 環境変数の設定
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_
  
  - [x] 1.2 フロントエンドビルド設定の確認
    - package.jsonのbuildスクリプトを確認
    - Vite設定ファイル（vite.config.ts）を確認
    - 出力ディレクトリ（dist）を確認
    - _Requirements: 3.1, 3.2_
  
  - [x] 1.3 バックエンドビルド設定の確認
    - package.jsonのbuildスクリプトを確認
    - TypeScript設定（tsconfig.json）を確認
    - 出力ディレクトリ（dist）を確認
    - _Requirements: 3.1, 3.2_
  
  - [x] 1.4 .vercelignoreファイルの作成
    - node_modules、.env、テストファイル等を除外
    - _Requirements: 3.7_

- [ ] 2. 環境変数設定
  - [x] 2.1 本番環境用.envファイルの準備
    - フロントエンド用環境変数リストを作成
    - バックエンド用環境変数リストを作成
    - 機密情報の確認（Supabase、Google API等）
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_
  
  - [x] 2.2 フロントエンドAPI URL設定
    - VITE_API_URLを本番環境用に設定
    - 開発環境と本番環境の切り替えロジックを確認
    - _Requirements: 2.2_
  
  - [x] 2.3 バックエンド環境変数の確認
    - データベース接続情報（SUPABASE_URL、DATABASE_URL）
    - Google Sheets API設定
    - Google Drive API設定
    - JWT_SECRET、ENCRYPTION_KEY
    - _Requirements: 2.1, 2.3, 2.4, 2.5_
  
  - [x] 2.4 Vercel環境変数の設定
    - Vercel Dashboardで環境変数を設定
    - または vercel.jsonに非機密情報を追加
    - _Requirements: 2.7_

- [ ] 3. SEO最適化実装
  - [x] 3.1 react-helmet-asyncのインストール
    - npm install react-helmet-async
    - HelmetProviderをApp.tsxに追加
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 3.2 SEOHeadコンポーネントの作成
    - frontend/src/components/SEOHead.tsxを作成
    - メタタグ（title、description）の設定
    - Open Graphタグの設定
    - Twitter Cardタグの設定
    - canonicalタグの設定
    - _Requirements: 4.1, 4.2, 4.3_
  
  - [x] 3.3 構造化データ（JSON-LD）の実装
    - frontend/src/utils/structuredData.tsを作成
    - 物件リスト用の構造化データ生成関数
    - StructuredDataコンポーネントの作成
    - _Requirements: 4.5_
  
  - [x] 3.4 各ページへのSEO適用
    - PublicPropertyListingPageにSEOHeadを追加
    - PublicPropertyDetailPageにSEOHeadと構造化データを追加
    - ページごとに適切なtitle、descriptionを設定
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  
  - [x] 3.5 サイトマップルーティングの設定
    - vercel.jsonに /sitemap.xml → /api/public/sitemap のルーティングを追加
    - _Requirements: 4.4_
  
  - [x] 3.6 画像alt属性の確認
    - すべての画像にalt属性が設定されているか確認
    - 不足している場合は追加
    - _Requirements: 4.7_

- [ ] 4. パフォーマンス最適化
  - [x] 4.1 画像最適化コンポーネントの作成
    - frontend/src/components/OptimizedImage.tsxを作成
    - lazy loading実装
    - プレースホルダー表示
    - エラーハンドリング
    - _Requirements: 5.2, 5.3_
  
  - [x] 4.2 既存の画像をOptimizedImageに置き換え
    - PropertyCardコンポーネント
    - PublicPropertyDetailPageコンポーネント
    - _Requirements: 5.2, 5.3_
  
  - [x] 4.3 コード分割の実装
    - React.lazyでページコンポーネントを遅延読み込み
    - Suspenseでローディング状態を表示
    - _Requirements: 5.4_
  
  - [x] 4.4 React Queryキャッシュ設定の最適化
    - staleTime、cacheTimeの調整
    - refetchOnWindowFocusの設定
    - _Requirements: 5.6_
  
  - [x] 4.5 バックエンド圧縮の有効化
    - compressionミドルウェアの追加（既に実装済みか確認）
    - _Requirements: 5.5_
  
  - [x] 4.6 Viteビルド最適化
    - vite.config.tsでビルド最適化設定
    - チャンクサイズの最適化
    - tree shakingの確認
    - _Requirements: 3.3, 3.4, 3.5_

- [ ] 5. セキュリティ設定
  - [x] 5.1 CORS設定の更新
    - 本番環境のドメインを許可リストに追加
    - 開発環境との切り替えロジック
    - _Requirements: 6.2_
  
  - [x] 5.2 セキュリティヘッダーの設定
    - helmetミドルウェアの設定（既に実装済みか確認）
    - Content Security Policy (CSP)の設定
    - X-Frame-Options、X-Content-Type-Optionsの設定
    - _Requirements: 6.6_
  
  - [x] 5.3 入力サニタイゼーションの確認
    - 問い合わせフォームの入力検証
    - APIエンドポイントの入力検証
    - _Requirements: 6.3_
  
  - [x] 5.4 レート制限の確認
    - 既存のレート制限実装を確認
    - 本番環境用の設定を調整
    - _Requirements: 6.4_
  
  - [x] 5.5 HTTPS強制の設定
    - vercel.jsonまたはバックエンドでHTTPS強制
    - _Requirements: 6.1_

- [ ] 6. モニタリングとエラー追跡
  - [ ] 6.1 バックエンドエラーハンドリングの実装
    - エラーハンドリングミドルウェアの作成
    - エラーログの記録（console.error）
    - エラーレスポンスの標準化
    - _Requirements: 7.1, 7.6_
  
  - [ ] 6.2 フロントエンドエラートラッキングの実装
    - frontend/src/utils/errorTracking.tsを作成
    - グローバルエラーハンドラーの設定
    - React Error Boundaryの実装
    - _Requirements: 7.2_
  
  - [ ] 6.3 ヘルスチェックエンドポイントの作成
    - GET /api/health エンドポイントを作成
    - データベース接続チェック
    - システムステータスの返却
    - _Requirements: 8.3_
  
  - [ ] 6.4 アナリティクス設定（オプション）
    - Google Analytics 4の設定
    - イベントトラッキングの実装
    - _Requirements: 7.4_

- [ ] 7. デプロイ準備
  - [x] 7.1 .gitignoreの確認
    - .env、node_modules、dist等が除外されているか確認
    - _Requirements: 2.6_
  
  - [x] 7.2 package.jsonの確認
    - すべての依存関係が正しくインストールされているか
    - ビルドスクリプトが正しく動作するか
    - _Requirements: 3.1, 3.2_
  
  - [ ] 7.3 ローカルビルドテスト
    - フロントエンド: cd frontend && npm run build
    - バックエンド: cd backend && npm run build
    - ビルドエラーがないか確認
    - _Requirements: 3.1, 3.2, 3.6_
  
  - [ ] 7.4 ローカルプロダクションテスト
    - フロントエンド: npm run preview
    - バックエンド: NODE_ENV=production npm start
    - 動作確認
    - _Requirements: 8.3_

- [ ] 8. Vercelへのデプロイ
  - [ ] 8.1 Vercel CLIのインストール
    - npm install -g vercel
    - vercel login
    - _Requirements: 8.1_
  
  - [ ] 8.2 初回デプロイ
    - vercel コマンドでプレビューデプロイ
    - デプロイ結果の確認
    - _Requirements: 8.1, 8.5_
  
  - [ ] 8.3 環境変数の設定
    - Vercel Dashboardで環境変数を設定
    - または vercel env add コマンドで設定
    - _Requirements: 2.7_
  
  - [ ] 8.4 本番デプロイ
    - vercel --prod コマンドで本番デプロイ
    - デプロイ完了を確認
    - _Requirements: 8.1, 8.2_

- [ ] 9. デプロイ後検証
  - [ ] 9.1 サイトアクセス確認
    - デプロイされたURLにアクセス
    - トップページが表示されるか確認
    - _Requirements: 1.5_
  
  - [ ] 9.2 機能テスト
    - 物件一覧ページの表示確認
    - 物件詳細ページの表示確認
    - フィルター機能の動作確認
    - 問い合わせフォームの送信テスト
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  
  - [ ] 9.3 APIエンドポイントテスト
    - GET /api/public/properties
    - GET /api/public/properties/:id
    - POST /api/public/inquiries
    - GET /api/public/sitemap
    - GET /api/health
    - _Requirements: 1.6_
  
  - [ ] 9.4 SEO確認
    - メタタグが正しく設定されているか（View Page Source）
    - サイトマップが生成されているか（/sitemap.xml）
    - 構造化データが正しいか（Google Rich Results Test）
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 9.5 パフォーマンステスト
    - Lighthouse テストを実行
    - Performance スコアが90以上か確認
    - ページロード時間が3秒以内か確認
    - _Requirements: 5.1, 5.7_
  
  - [ ] 9.6 セキュリティ確認
    - HTTPSが強制されているか確認
    - セキュリティヘッダーが設定されているか確認
    - CORS設定が正しいか確認
    - _Requirements: 6.1, 6.2, 6.6_
  
  - [ ] 9.7 エラーハンドリング確認
    - 存在しない物件IDでアクセス（404エラー）
    - 無効なフォーム送信（バリデーションエラー）
    - レート制限のテスト
    - _Requirements: 7.1, 7.2_

- [ ] 10. カスタムドメイン設定（オプション）
  - [ ] 10.1 Vercelでドメイン追加
    - Vercel Dashboard → Settings → Domains
    - カスタムドメインを追加
    - _Requirements: 9.1, 9.2_
  
  - [ ] 10.2 DNS設定
    - A RecordまたはCNAME Recordを設定
    - DNS伝播を待つ（最大48時間）
    - _Requirements: 9.5, 9.6_
  
  - [ ] 10.3 SSL証明書の確認
    - Vercelが自動的にSSL証明書をプロビジョニング
    - HTTPSでアクセスできるか確認
    - _Requirements: 9.2, 9.3_
  
  - [ ] 10.4 リダイレクト設定
    - HTTPからHTTPSへのリダイレクト
    - wwwと非wwwの統一
    - _Requirements: 9.3, 9.4_

- [ ] 11. ドキュメント作成
  - [ ] 11.1 デプロイ手順書の作成
    - デプロイコマンド
    - 環境変数の設定方法
    - トラブルシューティング
    - _Requirements: 8.5_
  
  - [ ] 11.2 運用マニュアルの作成
    - モニタリング方法
    - エラー対応手順
    - ロールバック手順
    - _Requirements: 8.4, 10.4_
  
  - [ ] 11.3 環境変数リストの作成
    - 必要な環境変数の一覧
    - 各変数の説明
    - 取得方法
    - _Requirements: 2.7_

- [ ] 12. 最終チェックポイント
  - [ ] 12.1 すべての機能が正常に動作しているか確認
  - [ ] 12.2 パフォーマンスが要件を満たしているか確認
  - [ ] 12.3 セキュリティ設定が適切か確認
  - [ ] 12.4 ドキュメントが完成しているか確認
  - [ ] 12.5 ユーザーに質問があれば確認

## Notes

- タスクは順番に実行することを推奨
- 各タスク完了後、動作確認を行う
- 問題が発生した場合は、ロールバックできるように準備
- 本番デプロイ前に必ずプレビューデプロイでテスト
- 環境変数は絶対にGitにコミットしない
- デプロイ後は必ずモニタリングを行う
