# Implementation Plan: 買主SMS近隣物件リンク追加機能

## Overview

買主詳細ページのSMS送信機能において、SMS本文に所在地が含まれる場合、自動的に近隣物件へのリンクを追加する機能を実装します。実装は段階的に進め、各フェーズで動作確認を行います。

## Tasks

- [x] 1. フロントエンド実装（近隣物件リンク挿入機能）
  - [x] 1.1 insertNearbyPropertyLink関数を実装
    - `BuyerDetailPage.tsx`に`insertNearbyPropertyLink()`関数を追加
    - 所在地プレースホルダーの検出ロジック実装
    - 買主に紐づいた物件の確認ロジック実装
    - 短縮URL生成ロジック実装（`https://ifoo.jp/p/{物件番号}`）
    - 挿入位置の検索と挿入ロジック実装（「お気軽にお問合せください」の直前、または末尾）
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4_

  - [x] 1.2 handleSmsTemplateSelect関数を修正
    - `replacePlaceholders()`実行後に`insertNearbyPropertyLink()`を呼び出し
    - 近隣物件リンク挿入後の本文を確認ダイアログに渡す
    - _Requirements: 5.2_

  - [x] 1.3 文字数チェック機能を実装
    - 近隣物件リンク挿入後の文字数をカウント
    - 670文字を超える場合は警告メッセージを表示
    - 警告が出ても確認ダイアログは表示（ユーザーが判断）
    - _Requirements: 4.1_

  - [ ]* 1.4 フロントエンド単体テストを実装
    - 所在地プレースホルダーあり + 物件あり → リンク挿入
    - 所在地プレースホルダーなし + 物件あり → リンク挿入なし
    - 所在地プレースホルダーあり + 物件なし → リンク挿入なし
    - 「お気軽にお問合せください」あり → マーカー直前に挿入
    - 「お気軽にお問合せください」なし → 末尾に挿入
    - 670文字ちょうど → 警告なし
    - 671文字 → 警告あり
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.4, 4.1_

  - [ ]* 1.5 フロントエンドプロパティベーステストを実装
    - **Property 1: 近隣物件リンク挿入の条件判定**
    - **Validates: Requirements 1.1, 1.3, 1.4**
    - **Property 2: 短縮URL生成の形式**
    - **Validates: Requirements 2.1, 2.2, 2.3, 2.5**
    - **Property 3: 挿入位置の制御**
    - **Validates: Requirements 3.1, 3.2, 3.4**
    - **Property 4: リンクフォーマット**
    - **Validates: Requirements 1.2, 3.3**
    - **Property 5: 文字数制限チェック**
    - **Validates: Requirements 4.1**
    - **Property 6: プレースホルダー置換後の挿入**
    - **Validates: Requirements 5.2**
    - **Property 8: プレビュー表示**
    - **Validates: Requirements 6.1, 6.3**
    - fast-checkライブラリを使用
    - 各プロパティテストは最低100回反復実行
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.5, 3.1, 3.2, 3.3, 3.4, 4.1, 5.2, 6.1, 6.3_

- [x] 2. Checkpoint - フロントエンド動作確認
  - ローカル環境でフロントエンドを起動
  - 買主詳細ページでSMSテンプレートを選択
  - プレビューに近隣物件リンクが表示されることを確認
  - 文字数カウントが正しく動作することを確認
  - 全てのテストが通ることを確認
  - 問題があればユーザーに報告

- [x] 3. バックエンド実装（近隣物件API）
  - [x] 3.1 backend/api/index.tsにnearbyパラメータ処理を追加
    - `/api/public/properties?nearby={物件番号}`エンドポイントを実装
    - `BuyerService.getNearbyProperties`を使用して近隣物件を取得
    - `PropertyListingService.getPublicPropertyByNumber`を使用して物件詳細と画像を取得
    - ページネーション対応（limit, offset）
    - 価格フィールド計算（sales_price || listing_price）
    - バッジタイプ設定（sold, available）
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 3.2 PropertyListingService.getPublicPropertyByNumberで画像を取得
    - `image_url`または`storage_location`から画像を取得
    - `PropertyImageService`を使用してGoogle Driveから画像を取得
    - 画像オブジェクト形式に変換（thumbnailUrl, fullImageUrl）
    - _Requirements: 7.1_

  - [x] 3.3 フロントエンド近隣物件フィルター対応
    - `PublicPropertiesPage.tsx`の`fetchProperties`関数に`nearby`パラメータ処理を追加
    - URLクエリパラメータから`nearby`を取得
    - APIリクエストに`nearby`パラメータを追加
    - _Requirements: 7.1_

  - [ ]* 3.4 バックエンド単体テストを実装
    - 有効な物件番号（"AA3333"） → 近隣物件4件取得
    - 無効な物件番号（"INVALID"） → 500エラー
    - 物件番号なし → 通常の物件一覧取得
    - ページネーション動作確認
    - 画像取得動作確認
    - _Requirements: 7.1, 7.2, 7.3_

  - [ ]* 3.5 バックエンドプロパティベーステストを実装
    - **Property 7: 近隣物件API処理**
    - **Validates: Requirements 7.1, 7.2, 7.3**
    - fast-checkライブラリを使用
    - 有効な物件番号と無効な物件番号をランダム生成
    - 各プロパティテストは最低100回反復実行
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 4. Checkpoint - バックエンド動作確認
  - 近隣物件API（`/api/public/properties?nearby=AA3333`）にアクセスして近隣物件4件が返ることを確認
  - 各物件に画像が含まれることを確認
  - フロントエンドで近隣物件ページ（`/public/properties?nearby=AA3333`）を開いて近隣物件が表示されることを確認
  - 画像が正しく表示されることを確認
  - 問題があればユーザーに報告

- [ ] 5. インフラ設定（ドメインとSSL）- **オプション3では不要**
  - [ ] 5.1 ifoo.jpドメインのDNSレコード設定 - **スキップ**
    - オプション3（単一リンク方式）では短縮URLを使用しないため、ドメイン設定は不要
    - _Requirements: 9.1, 9.2_

  - [ ] 5.2 Vercelプロジェクトにドメインを追加 - **スキップ**
    - オプション3（単一リンク方式）では短縮URLを使用しないため、ドメイン設定は不要
    - _Requirements: 9.3, 9.4_

- [ ] 6. Checkpoint - インフラ動作確認 - **オプション3では不要**
  - オプション3（単一リンク方式）では短縮URLを使用しないため、インフラ確認は不要

- [x] 7. 統合テストとデプロイ
  - [x] 7.1 本番環境へのデプロイ
    - フロントエンドとバックエンドの変更をコミット
    - GitHubにプッシュ
    - Vercelが自動的に本番環境をデプロイ
    - 本番環境で動作確認
    - _Requirements: 全要件_

  - [x] 7.2 近隣物件API動作確認
    - 本番環境で近隣物件API（`/api/public/properties?nearby=AA3333`）にアクセス
    - 近隣物件4件が返ることを確認
    - 各物件に画像が含まれることを確認
    - _Requirements: 全要件_

  - [x] 7.3 フロントエンド動作確認
    - 本番環境で近隣物件ページ（`/public/properties?nearby=AA3333`）を開く
    - 近隣物件が表示されることを確認
    - 画像が正しく表示されることを確認
    - _Requirements: 全要件_

  - [ ] 7.4 E2Eテスト実行
    - 本番環境で買主詳細ページを開く
    - SMSテンプレートを選択
    - プレビューに近隣物件リンクが表示されることを確認
    - 近隣物件リンクをクリックして近隣物件ページに遷移することを確認
    - SMS送信記録が正しく保存されることを確認
    - _Requirements: 全要件_

  - [ ]* 7.5 統合テストを実装
    - フロントエンドからバックエンドまでのE2Eテスト
    - SMS本文生成 → 近隣物件リンク → 近隣物件ページ表示
    - _Requirements: 全要件_

- [ ] 8. Final Checkpoint - 本番環境動作確認
  - 本番環境で買主詳細ページを開く
  - SMSテンプレートを選択
  - プレビューに近隣物件リンクが表示されることを確認
  - 近隣物件リンク（`https://property-site-frontend-kappa.vercel.app/public/properties?nearby=AA9831`）をクリック
  - 近隣物件ページに正しく遷移することを確認
  - 近隣物件が4件表示されることを確認
  - 画像が正しく表示されることを確認
  - SMS送信記録が正しく保存されることを確認
  - 全てのテストが通ることを確認
  - 問題があればユーザーに報告

## Notes

- タスクに`*`が付いているものはオプション（テスト関連）で、コア機能の実装を優先する場合はスキップ可能
- 各タスクは特定の要件を参照しており、トレーサビリティを確保
- チェックポイントタスクで段階的に動作確認を行い、問題を早期発見
- プロパティベーステストは各プロパティを個別のテストとして実装
- 単体テストは特定の例とエッジケースを検証
- 統合テストはE2Eフローを検証
- 既存機能への影響を最小限に抑えるため、段階的にデプロイ
