# Implementation Plan - ログイン機能修正

## 1. Supabase設定の確認と修正

- [x] 1.1 Supabase DashboardでRedirect URLsを確認・設定
  - Development: `http://localhost:5173/auth/callback`を追加
  - Production: 本番URLを追加（必要に応じて）
  - Google OAuth設定の確認
  - _Requirements: 1.1, 1.2_
  - ✅ ユーザー確認済み

- [x] 1.2 環境変数の確認
  - フロントエンドとバックエンドの環境変数が正しく設定されているか確認
  - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEYの確認
  - _Requirements: 2.2_
  - ✅ 環境変数確認完了 - すべて正しく設定されている

## 2. AuthCallbackPageの作成

- [x] 2.1 AuthCallbackPage.tsxを作成
  - OAuth認証後のコールバック処理専用ページ
  - `handleAuthCallback()`を呼び出し
  - ローディング表示
  - エラーハンドリング
  - 認証成功後にホームページへリダイレクト
  - _Requirements: 1.2, 1.3, 1.4_

- [x] 2.2 App.tsxにルートを追加
  - `/auth/callback`ルートを追加
  - AuthCallbackPageをマウント
  - _Requirements: 1.2_

## 3. authStoreの修正

- [x] 3.1 handleAuthCallback()の改善
  - セッション取得のタイミングを最適化
  - エラーハンドリングの強化
  - ローディング状態の管理
  - _Requirements: 1.2, 1.3, 1.4, 2.1, 2.3_

- [x] 3.2 loginWithGoogle()のリダイレクトURI修正
  - `redirectTo`を`${window.location.origin}/auth/callback`に設定
  - エラーハンドリングの追加
  - _Requirements: 1.1, 1.2_

- [x] 3.3 checkAuth()の改善
  - セッション検証ロジックの最適化
  - エラーハンドリングの強化
  - _Requirements: 1.4, 2.1_

## 4. バックエンドのエラーハンドリング改善

- [x] 4.1 auth.supabase.tsのエラーレスポンス統一
  - エラーレスポンス形式の統一
  - リトライ可能フラグの追加
  - 詳細なエラーログ出力
  - _Requirements: 2.1, 2.3, 2.4_

- [x] 4.2 AuthService.supabase.tsのエラーハンドリング強化
  - `getOrCreateEmployee()`のエラーハンドリング
  - `validateSession()`のエラーハンドリング
  - データベースエラーの適切な処理
  - _Requirements: 1.3, 2.1_

## 5. ログ出力の最適化

- [x] 5.1 開発環境用ログの整理
  - デバッグ用ログを適切なレベルに分類
  - センシティブ情報のマスキング
  - _Requirements: 2.1, 2.4_

- [x] 5.2 本番環境用ログ設定
  - 環境変数によるログレベル制御
  - エラーログのみ出力
  - _Requirements: 2.1_

## 6. エラーメッセージの改善

- [x] 6.1 LoginPage.tsxのエラー表示改善
  - より具体的なエラーメッセージ
  - リトライボタンの追加
  - _Requirements: 1.5, 2.1, 2.2_

- [x] 6.2 AuthCallbackPage.tsxのエラー表示
  - 認証失敗時のエラーメッセージ
  - ログインページへのリンク
  - _Requirements: 1.5, 2.1_

## 7. Checkpoint - 基本機能の動作確認

- [x] 7. Ensure all tests pass, ask the user if questions arise.
  - ✅ 環境変数確認完了

## 8. 統合テストの実装

- [x] 8.1 OAuth Flow統合テストの作成
  - ログインボタンクリック → OAuth画面表示のテスト
  - コールバック処理のテスト
  - 社員レコード作成のテスト
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - ✅ `backend/src/routes/__tests__/auth.test.ts` - 11テスト全て合格

- [x] 8.2 エラーハンドリング統合テストの作成
  - 無効なトークンでのコールバックテスト
  - ネットワークエラー時の挙動テスト
  - エラーメッセージ表示のテスト
  - _Requirements: 1.5, 2.1, 2.2, 2.3_
  - ✅ `backend/src/routes/__tests__/auth.error-handling.test.ts` - 15テスト全て合格

- [x] 8.3 セッション管理統合テストの作成
  - ログイン後のセッション永続化テスト
  - ページリロード後のセッション復元テスト
  - ログアウト後のセッションクリアテスト
  - _Requirements: 1.4_
  - ✅ `backend/src/routes/__tests__/auth.session.test.ts` - 12テスト全て合格

## 9. 手動テストの実施

- [ ] 9.1 正常系の手動テスト
  - ログインボタンクリック → Google OAuth画面表示
  - Google アカウント選択 → 承認
  - 認証後にホームページへリダイレクト
  - ユーザー情報の表示確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ] 9.2 異常系の手動テスト
  - OAuth承認キャンセル時のエラー表示
  - ネットワークエラー時のエラー表示
  - 無効なトークンでのエラー処理
  - _Requirements: 1.5, 2.1, 2.2_

- [ ] 9.3 セッション管理の手動テスト
  - ログイン後のページリロード
  - ログアウト後のリダイレクト
  - トークン期限切れ後の再ログイン
  - _Requirements: 1.4_

## 10. ドキュメントの作成

- [x] 10.1 トラブルシューティングガイドの作成
  - よくある問題と解決方法
  - Supabase設定の確認手順
  - 環境変数の設定手順
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 10.2 デプロイメントガイドの更新
  - Supabase設定手順
  - 環境変数設定手順
  - 動作確認手順
  - _Requirements: 1.1, 1.2_

## 11. Final Checkpoint - 全体動作確認

- [ ] 11. Ensure all tests pass, ask the user if questions arise.
