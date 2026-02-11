# Implementation Plan: 買付情報セクションの条件付き表示とGoogle Chat送信機能

## Overview

買主詳細ページの内覧結果ページにおける「買付情報」セクションの表示条件を実装し、Google Chat への自動送信機能を追加します。フロントエンドでの条件付き表示ロジックとバックエンドでのメッセージ生成・送信機能を実装します。

## Tasks

- [ ] 1. バックエンドAPIの実装
  - [x] 1.1 GoogleChatServiceクラスを作成
    - Google Chat Webhook URLの定義
    - メッセージ送信メソッド（sendOfferMessage）の実装
    - メッセージ生成メソッド（generateOfferMessage）の実装
    - 4つのパターン（業者問合せ × 媒介契約種別）に対応
    - _Requirements: 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ] 1.2 GoogleChatServiceのユニットテストを作成
    - メッセージ生成パターンのテスト（4パターン）
    - 必須フィールド包含のテスト
    - エラーハンドリングのテスト
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.3_
  
  - [x] 1.3 買付チャット送信APIエンドポイントを作成
    - POST /api/google-chat/send-offer エンドポイントの実装
    - リクエストボディのバリデーション
    - 買主・物件データの取得
    - GoogleChatServiceの呼び出し
    - エラーハンドリング（データ不足、API エラー）
    - _Requirements: 3.1, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10, 5.11, 5.12, 6.1, 6.2, 6.3_
  
  - [ ] 1.4 APIエンドポイントのユニットテストを作成
    - 正常系のテスト（成功レスポンス）
    - 異常系のテスト（買主データ不足、物件データ不足、API エラー）
    - _Requirements: 6.1, 6.2, 6.3_

- [ ] 2. フロントエンドの実装
  - [x] 2.1 買付情報セクションの条件付き表示ロジックを実装
    - shouldShowOfferSection関数の実装
    - 「買」を含み、「買付外れました」を含まない場合のみ表示
    - 条件に応じてセクション全体を表示/非表示
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  
  - [x] 2.2 買付チャット送信ハンドラーを実装
    - handleOfferChatSend関数の実装
    - バックエンドAPIへのPOSTリクエスト
    - 成功時のスナックバー表示
    - エラー時のスナックバー表示
    - _Requirements: 3.1, 3.3, 3.4, 6.1, 6.2, 6.3, 6.4_
  
  - [x] 2.3 買付情報セクションのUIを更新
    - 買付コメントフィールドの表示（任意）
    - 買付チャット送信ボタンの実装
    - ボタンクリック時のハンドラー接続
    - 既存の「送信」ボタンを新しいハンドラーに置き換え
    - _Requirements: 2.1, 2.2, 2.3, 3.1_
  
  - [ ] 2.4 フロントエンドのユニットテストを作成
    - shouldShowOfferSection関数のテスト（複数パターン）
    - handleOfferChatSend関数のテスト（成功・失敗）
    - UI要素の表示/非表示のテスト
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [x] 3. Checkpoint - 基本機能の動作確認
  - 買主詳細ページで「★最新状況」に「買付申込」を設定
  - 買付情報セクションが表示されることを確認
  - 買付コメントを入力
  - 買付チャット送信ボタンをクリック
  - Google Chatにメッセージが送信されることを確認
  - 成功メッセージが表示されることを確認
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Property-based testsの実装
  - [ ] 4.1 Property 1のテストを実装
    - **Property 1: 買付情報セクションの表示条件（「買」を含む場合）**
    - **Validates: Requirements 1.1**
  
  - [ ] 4.2 Property 2のテストを実装
    - **Property 2: 買付情報セクションの非表示条件（「買」を含まない場合）**
    - **Validates: Requirements 1.3**
  
  - [ ] 4.3 Property 3のテストを実装
    - **Property 3: 非表示時のDOM要素の不在**
    - **Validates: Requirements 1.4**
  
  - [ ] 4.4 Property 4のテストを実装
    - **Property 4: メッセージ生成パターンの正確性**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [ ] 4.5 Property 5のテストを実装
    - **Property 5: メッセージ内の必須フィールド包含**
    - **Validates: Requirements 4.5**

- [ ] 5. Integration testsの実装
  - [ ] 5.1 エンドツーエンドフローのテストを実装
    - 買主詳細ページを開く
    - 買付情報セクションの表示確認
    - チャット送信の動作確認
    - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.3_
  
  - [ ]* 5.2 エラーフローのテストを実装
    - データ不足時のエラー表示確認
    - API エラー時のエラー表示確認
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [ ] 6. Final checkpoint - 全体の動作確認
  - 全てのテストが通ることを確認
  - 複数のパターン（業者問合せ × 媒介契約種別）で動作確認
  - エラーハンドリングの動作確認
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
