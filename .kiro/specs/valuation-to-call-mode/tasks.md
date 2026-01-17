# Implementation Plan

- [x] 1. CallModePageに査定計算セクションを追加





  - CallModePageに査定計算用のstate変数を追加（editingValuation, editedFixedAssetTaxRoadPrice, valuationAssignedBy, editedValuationAmount1-3, autoCalculating, sendingEmail, calculationTimerRef）
  - SellerDetailPageから査定計算関数をコピー（autoCalculateValuations, debouncedAutoCalculate, handleSendValuationEmail）
  - 左カラムのサイトセクションの後に査定計算セクションのJSXを追加
  - 査定計算セクションのスタイリングを維持
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ]* 1.1 Write property test for valuation auto-calculation completeness
  - **Property 1: Valuation auto-calculation completeness**
  - **Validates: Requirements 1.2, 1.4**

- [ ]* 1.2 Write property test for valuation calculation accuracy
  - **Property 2: Valuation calculation accuracy**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

- [ ]* 1.3 Write property test for calculation basis display completeness
  - **Property 3: Calculation basis display completeness**
  - **Validates: Requirements 1.3, 5.1, 5.2, 5.3**

- [x] 2. SellerDetailPageから査定計算セクションを削除



  - 査定計算セクション全体のJSXを削除（行860〜1120）
  - 査定計算用のstate変数を削除
  - 査定計算関数を削除
  - 簡潔な査定額表示セクションを追加（査定額のみ表示）
  - 通話モードへのリンクボタンを追加
  - _Requirements: 2.1, 2.2, 2.3_

- [ ]* 2.1 Write unit test for SellerDetailPage valuation section removal
  - 査定計算セクションが表示されないことを確認
  - 簡潔な査定額表示が表示されることを確認
  - 通話モードへのリンクが表示されることを確認
  - _Requirements: 2.1, 2.2, 2.3_

- [ ] 3. 査定メール送信機能の動作確認
  - CallModePageで査定メール送信ボタンが正しく表示されることを確認
  - 査定額が未計算の場合、ボタンが無効化されることを確認
  - 査定メール送信が正しく動作することを確認
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 3.1 Write property test for email send button availability
  - **Property 5: Email send button availability**
  - **Validates: Requirements 3.1, 3.3**

- [ ]* 3.2 Write property test for email send functionality
  - **Property 6: Email send functionality**
  - **Validates: Requirements 3.2**

- [ ] 4. 表示モード切り替え機能の実装確認
  - 簡潔表示モードと詳細編集モードが正しく切り替わることを確認
  - 編集ボタンと完了ボタンが正しく動作することを確認
  - _Requirements: 1.5_

- [ ]* 4.1 Write property test for display mode toggle availability
  - **Property 4: Display mode toggle availability**
  - **Validates: Requirements 1.5**

- [ ] 5. エラーハンドリングの実装確認
  - 物件情報がない場合、警告メッセージが表示されることを確認
  - API エラー時、エラーメッセージが表示されることを確認
  - 無効な入力値の場合、計算が実行されないことを確認
  - _Requirements: 1.2, 4.1_

- [ ]* 5.1 Write unit test for error handling scenarios
  - 物件情報欠損時の警告表示をテスト
  - API エラー時のエラーメッセージ表示をテスト
  - 無効な入力値の処理をテスト
  - _Requirements: 1.2, 4.1_

- [ ] 6. Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. 手動テストとUI確認
  - 通話モード画面で査定計算が正しく動作することを手動確認
  - 売主詳細画面で査定計算セクションが削除されていることを手動確認
  - レスポンシブデザインが崩れていないことを確認
  - 計算根拠が正しく表示されることを確認
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

- [ ] 8. Final Checkpoint - Make sure all tests are passing
  - Ensure all tests pass, ask the user if questions arise.
