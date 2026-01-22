# Implementation Plan

- [x] 1. フロントエンド: 手入力査定額フィールドの追加



  - CallModePageの査定計算セクションに手入力用の3つの数値入力フィールド（査定額1、査定額2、査定額3）を追加
  - 各フィールドに適切なラベルとプレースホルダーを設定
  - 数値入力のバリデーション（正の整数のみ受け付ける）を実装
  - 手入力モードを示す状態変数（isManualValuation）を追加
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for manual valuation input acceptance
  - **Property 1: Manual valuation input acceptance**

  - **Validates: Requirements 1.2, 1.3**

- [ ] 2. フロントエンド: 査定額表示の優先順位ロジック実装
  - 手入力値が存在する場合は手入力値を優先表示するロジックを実装
  - 手入力値がnullの場合は自動計算値にフォールバックするロジックを実装
  - ヘッダー部分の査定額表示を更新して優先順位ロジックを適用
  - 査定計算セクションの表示を更新して優先順位ロジックを適用
  - _Requirements: 2.1, 2.2, 2.5_

- [ ]* 2.1 Write property test for manual valuation priority
  - **Property 4: Manual valuation priority**
  - **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 3.4, 6.4**

- [x]* 2.2 Write property test for fallback to auto-calculated values

  - **Property 9: Fallback to auto-calculated values**
  - **Validates: Requirements 2.5, 6.3**

- [ ] 3. フロントエンド: 視覚的インジケーターの実装
  - 手入力値を表示している場合は「手入力」バッジを表示
  - 自動計算値を表示している場合は「自動計算」バッジを表示

  - 編集モード時に手入力フィールドと自動計算フィールドを明確に区別するラベルを追加
  - 手入力値が自動計算値を上書きしている場合のメッセージを表示
  - _Requirements: 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 4. フロントエンド: 手入力査定額の保存機能実装
  - 手入力査定額を保存するAPI呼び出しを実装
  - 保存時に現在のユーザー名をvaluationAssigneeとして送信
  - 保存成功時の成功メッセージ表示
  - 保存エラー時のエラーハンドリングとエラーメッセージ表示
  - ローディング状態の管理
  - _Requirements: 1.3, 5.1_

- [ ]* 4.1 Write property test for manual valuation persistence round trip
  - **Property 2: Manual valuation persistence round trip**
  - **Validates: Requirements 1.3, 1.4**

- [ ]* 4.2 Write property test for valuation assignee tracking
  - **Property 6: Valuation assignee tracking**
  - **Validates: Requirements 5.1, 5.5**


- [ ]* 4.3 Write property test for valuation timestamp tracking
  - **Property 7: Valuation timestamp tracking**
  - **Validates: Requirements 5.2, 5.5**

- [ ] 5. フロントエンド: 手入力査定額のクリア機能実装
  - 手入力査定額をクリアするボタンを追加
  - クリア時に確認ダイアログを表示
  - クリア実行時にAPI呼び出しでデータベースの値をnullに更新
  - クリア後に自動計算値を表示

  - _Requirements: 1.5, 6.3_

- [ ]* 5.1 Write property test for manual valuation deletion
  - **Property 3: Manual valuation deletion**
  - **Validates: Requirements 1.5**

- [ ] 6. フロントエンド: 物件種別に応じたUI調整
  - マンション物件の場合、固定資産税路線価フィールドをオプションとして表示
  - マンション以外の物件の場合、固定資産税路線価フィールドと手入力フィールドの両方を表示

  - 全ての物件種別で手入力フィールドを表示
  - _Requirements: 3.1, 3.2, 3.3_

- [ ]* 6.1 Write property test for manual valuation availability across property types
  - **Property 5: Manual valuation availability across property types**
  - **Validates: Requirements 3.1, 3.3**

- [x] 7. フロントエンド: 自動計算の防止ロジック実装


  - 手入力値が入力されている場合、固定資産税路線価の変更時に自動計算をトリガーしないロジックを実装
  - 手入力値がクリアされた場合のみ自動計算を有効化
  - _Requirements: 6.2_

- [ ]* 7.1 Write property test for auto-calculation prevention with manual input
  - **Property 8: Auto-calculation prevention with manual input**


  - **Validates: Requirements 6.2**

- [ ] 8. バックエンド: 売主更新APIの拡張
  - PUT /api/sellers/:id エンドポイントでvaluationAmount1, valuationAmount2, valuationAmount3の更新をサポート
  - valuationAssigneeフィールドの更新をサポート


  - 入力値のバリデーション（正の数値、型チェック）を実装
  - 査定額の順序チェック（amount1 ≤ amount2 ≤ amount3）を実装（警告のみ）
  - updated_atタイムスタンプの自動更新を確認
  - _Requirements: 1.3, 5.1, 5.2_


- [ ] 9. バックエンド: メールサービスの更新
  - EmailService.tsのsendValuationEmailメソッドを更新
  - 手入力査定額が存在する場合は手入力値を使用するロジックを実装
  - 手入力値がnullの場合は自動計算値を使用するフォールバックロジックを実装
  - メールテンプレートに正しい査定額が埋め込まれることを確認

  - _Requirements: 2.3_

- [ ] 10. フロントエンド: SMSテンプレートジェネレーターの更新
  - smsTemplateGenerators.tsの各テンプレート生成関数を更新
  - 手入力査定額が存在する場合は手入力値を使用するロジックを実装
  - 手入力値がnullの場合は自動計算値を使用するフォールバックロジックを実装
  - 全てのSMSテンプレートで正しい査定額が使用されることを確認


  - _Requirements: 2.4_

- [ ] 11. フロントエンド: 初期データロード時の手入力値の読み込み
  - loadAllData関数を更新して、売主データから手入力査定額を読み込み
  - 手入力値が存在する場合はisManualValuationフラグをtrueに設定
  - 手入力値を状態変数に設定
  - _Requirements: 1.4_

- [ ] 12. 統合テスト: エンドツーエンドフロー
  - 通話モードページを開いて手入力査定額を入力し保存する一連の流れをテスト
  - ヘッダー表示に正しい査定額が表示されることを確認
  - 査定メール送信時に正しい査定額が使用されることを確認
  - SMSテンプレート生成時に正しい査定額が使用されることを確認
  - 手入力値をクリアして自動計算値にフォールバックすることを確認
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 13. ドキュメント更新
  - README.mdに手入力査定額機能の説明を追加
  - API仕様書を更新（PUT /sellers/:idのリクエスト/レスポンス）
  - ユーザーガイドに手入力査定額の使い方を追加
  - _Requirements: All_
