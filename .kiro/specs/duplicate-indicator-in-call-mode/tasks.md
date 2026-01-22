# Implementation Plan

- [ ] 1. バックエンドAPI実装

  - 重複案件取得エンドポイントを実装
  - _Requirements: 1.1, 7.1_

- [x] 1.1 重複案件取得APIエンドポイントを実装


  - `GET /sellers/:id/duplicates`エンドポイントを`backend/src/routes/sellers.ts`に追加
  - 売主情報を取得し、電話番号とメールアドレスで重複を検出
  - 現在の売主IDを除外して重複を返す
  - エラーハンドリングを実装（404, 500エラー）
  - _Requirements: 1.1, 7.1, 7.4_

- [ ] 1.2 重複案件取得APIのユニットテストを作成


  - 正常系: 重複が正しく検出されること
  - 異常系: 売主が見つからない場合
  - 異常系: データベースエラーの場合
  - 自分自身が除外されることを確認
  - _Requirements: 1.1_

- [ ] 2. フロントエンドコンポーネント実装

  - 重複インジケーターと詳細モーダルのUIコンポーネントを実装
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 2.1 DuplicateIndicatorBadgeコンポーネントを作成


  - `frontend/src/components/DuplicateIndicatorBadge.tsx`を作成
  - 重複件数を表示するChipコンポーネントを実装
  - クリックイベントハンドラーを実装
  - 視覚的に目立つスタイル（警告色、パルスアニメーション）を適用
  - _Requirements: 1.2, 1.4, 1.5_

- [ ]* 2.2 DuplicateIndicatorBadgeのユニットテストを作成
  - 正しいカウントが表示されること
  - クリックイベントが発火すること
  - スタイルが適用されること
  - _Requirements: 1.2, 1.4, 1.5_

- [x] 2.3 ActivityItemコンポーネントを作成


  - `frontend/src/components/ActivityItem.tsx`を作成
  - 活動タイプに応じたアイコンを表示
  - 日時、担当者、内容を表示
  - 長いコンテンツはスクロール可能にする
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6_

- [ ]* 2.4 ActivityItemのユニットテストを作成
  - 各活動タイプで正しいアイコンが表示されること
  - 日時フォーマットが正しいこと
  - 長いコンテンツがスクロール可能であること
  - _Requirements: 4.2, 4.3, 4.4_

- [x] 2.5 DuplicateCardコンポーネントを作成


  - `frontend/src/components/DuplicateCard.tsx`を作成
  - 売主番号、名前、反響日、マッチタイプを表示
  - スプレッドシートコメントセクションを実装
  - コミュニケーション履歴セクションを実装（ActivityItemを使用）
  - 売主番号をクリック可能なリンクにする
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.7, 6.1, 6.2, 6.4, 6.5_

- [ ]* 2.6 DuplicateCardのユニットテストを作成
  - マッチタイプに応じた表示が正しいこと
  - コメントの有無に応じた表示が正しいこと
  - 履歴の有無に応じた表示が正しいこと
  - リンクが正しく機能すること
  - _Requirements: 2.3, 2.4, 2.5, 2.6, 3.2, 3.3, 4.7, 6.1, 6.4_

- [x] 2.7 DuplicateDetailsModalコンポーネントを作成


  - `frontend/src/components/DuplicateDetailsModal.tsx`を作成
  - モーダルダイアログの基本構造を実装
  - ローディング状態の表示を実装
  - 重複案件リストの表示（DuplicateCardを使用）
  - 閉じるボタンとEscキーでの閉じる機能を実装
  - _Requirements: 2.1, 2.2, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ]* 2.8 DuplicateDetailsModalのユニットテストを作成
  - 開閉が正しく動作すること
  - ローディング状態が表示されること
  - 重複案件が正しくレンダリングされること
  - Escキーで閉じることができること
  - _Requirements: 2.1, 5.4, 5.5, 5.6_

- [ ] 3. CallModePageへの統合
  - 通話モードページに重複検出機能を統合
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 7.1, 7.2, 7.3_

- [x] 3.1 CallModePageに重複検出ロジックを追加


  - `frontend/src/pages/CallModePage.tsx`を更新
  - 重複案件の状態管理を追加（duplicates, duplicatesLoading, duplicateModalOpen, duplicatesWithDetails, detailsLoading）
  - 売主情報ロード後に非同期で重複検出APIを呼び出す
  - 重複が見つかった場合にDuplicateIndicatorBadgeを表示
  - インジケータークリック時にモーダルを開く処理を実装
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 7.1, 7.2, 7.3_

- [x] 3.2 重複案件詳細情報の取得ロジックを実装

  - モーダルが開かれたときに各重複案件の詳細情報を取得
  - コメント（seller.comments）と活動履歴（/sellers/:id/activities）を並列で取得
  - 取得した情報をDuplicateWithDetails型に変換
  - エラーハンドリングを実装（部分的なデータでも表示）
  - _Requirements: 3.1, 4.1, 7.5_

- [x] 3.3 CallModePageのヘッダー部分にDuplicateIndicatorBadgeを配置



  - 売主番号の右隣にDuplicateIndicatorBadgeを配置
  - 重複がない場合は表示しない
  - 重複件数を正しく表示
  - _Requirements: 1.2, 1.3, 1.5_

- [x] 3.4 DuplicateDetailsModalをCallModePageに配置




  - モーダルコンポーネントを配置
  - 開閉状態を管理
  - 重複案件データを渡す
  - _Requirements: 2.1, 2.2, 5.1_

- [ ]* 3.5 統合テストを作成
  - 通話モードページロード → 重複検出 → インジケーター表示のフロー
  - インジケータークリック → モーダル表示 → 詳細情報ロードのフロー
  - 売主番号クリック → 新しいタブで詳細ページ表示のフロー
  - _Requirements: 1.1, 1.2, 2.1, 6.2, 6.3_

- [ ] 4. エラーハンドリングとパフォーマンス最適化
  - エラーケースの処理とパフォーマンス改善を実装
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 4.1 フロントエンドのエラーハンドリングを実装



  - 重複検出失敗時: ログ記録のみ、ユーザーには通知しない
  - 詳細情報取得失敗時: モーダル内にエラーメッセージとリトライボタンを表示
  - ネットワークタイムアウト: 10秒のタイムアウトを設定
  - _Requirements: 7.4_

- [x] 4.2 パフォーマンス最適化を実装



  - 重複検出結果のセッションキャッシュを実装
  - 詳細情報のセッションキャッシュを実装
  - 活動履歴の表示件数制限（最新20件）を実装
  - 複数重複案件の詳細情報を並列取得（Promise.all）
  - _Requirements: 7.1, 7.3, 7.5_

- [ ]* 4.3 パフォーマンステストを作成
  - 重複検出が2秒以内に完了すること
  - 詳細情報ロードが3秒以内に完了すること
  - 10件の重複案件でも5秒以内に表示できること
  - _Requirements: 7.1, 7.3_

- [ ] 5. 最終確認とドキュメント更新
  - すべての機能が正しく動作することを確認し、ドキュメントを更新
  - _Requirements: All_

- [x] 5.1 手動テストを実施


  - AA5681のような重複案件で動作確認
  - 重複がない案件で動作確認
  - 複数の重複がある案件で動作確認
  - エラーケースの動作確認
  - _Requirements: All_



- [x] 5.2 ユーザーガイドを更新


  - 新機能の使い方を説明するセクションを追加
  - スクリーンショットを追加
  - _Requirements: All_


- [x] 5.3 開発者ドキュメントを更新

  - API仕様を追加
  - コンポーネント仕様を追加
  - _Requirements: All_

- [x] 6. Checkpoint - すべてのテストが通ることを確認


  - Ensure all tests pass, ask the user if questions arise.
