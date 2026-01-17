# Implementation Plan

- [x] 1. Backend: 有効な社員取得APIの更新（GYOSHA除外）


  - `/api/employees/active` エンドポイントを更新
  - 有効な社員のみをフィルタリング
  - メールアドレスが存在する社員のみを返す
  - GYOSHAユーザー（メールアドレスに"GYOSHA"を含む）を除外
  - ただし`tenant@ifoo-oita.com`は常に含める
  - 名前でソート
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 1.1 Property test: 有効な社員のみ返却
  - **Property 2: Active employee email inclusion**
  - **Validates: Requirements 2.2**

- [ ]* 1.2 Property test: 非有効な社員は除外
  - **Property 3: Inactive employee email exclusion**
  - **Validates: Requirements 2.2**

- [ ]* 1.3 Property test: GYOSHAユーザーは除外（tenant除く）
  - **Property 9: GYOSHA user exclusion**
  - **Validates: Requirements 2.4, 2.5**



- [ ] 2. Backend: Email送信APIの更新
  - `POST /api/sellers/:sellerId/send-template-email` に `from` パラメータを追加
  - `from` パラメータのバリデーション（有効な社員のメールアドレスまたはtenant@ifoo-oita.com）
  - `from` が指定されていない場合は `employeeEmail` を使用（後方互換性）
  - EmailServiceの `sendTemplateEmail` メソッドに `from` パラメータを追加
  - _Requirements: 1.4, 1.5, 2.4, 2.5_

- [ ]* 2.1 Property test: 送信元アドレスのバリデーション
  - **Property 4: Sender address validation**
  - **Validates: Requirements 2.4**

- [ ]* 2.2 Property test: From ヘッダーの一貫性
  - **Property 5: Email From header consistency**
  - **Validates: Requirements 1.4**

- [x]* 2.3 Property test: Reply-To ヘッダーの一貫性


  - **Property 6: Email Reply-To header consistency**
  - **Validates: Requirements 1.5**

- [ ] 3. Frontend: SenderAddressSelectorコンポーネントの作成
  - 送信元アドレス選択用のドロップダウンコンポーネント
  - 社員名とメールアドレスを表示
  - デフォルト値として `tenant@ifoo-oita.com` を設定
  - ツールチップで社員の役割を表示
  - _Requirements: 1.1, 1.2, 3.1, 3.2, 3.3_

- [ ]* 3.1 Property test: デフォルト送信元アドレスの初期化
  - **Property 1: Default sender address initialization**
  - **Validates: Requirements 1.2**

- [ ]* 3.2 Unit test: SenderAddressSelectorコンポーネント
  - デフォルトアドレスが選択されていることを確認


  - 有効な社員が表示されることを確認
  - 非有効な社員が表示されないことを確認
  - onChange が正しく呼ばれることを確認
  - 空の社員リストを処理できることを確認

- [ ] 4. Frontend: 社員データ取得とキャッシュの実装
  - `/api/employees/active` を呼び出す関数を作成
  - ローカルストレージでキャッシュ（5分間有効）
  - キャッシュが有効な場合はAPIを呼ばない
  - エラーハンドリング（APIエラー時はデフォルトアドレスのみ表示）


  - _Requirements: 2.1, 2.5, 4.4, 4.5_

- [ ]* 4.1 Unit test: 社員データ取得とキャッシュ
  - キャッシュが有効な場合はAPIを呼ばないことを確認
  - キャッシュが無効な場合はAPIを呼ぶことを確認
  - APIエラー時にデフォルトアドレスのみ返すことを確認

- [x] 5. Frontend: セッションストレージでの選択保持


  - 送信元アドレスの選択をセッションストレージに保存
  - ページ遷移後も選択を保持
  - セッションストレージから選択を復元
  - _Requirements: 1.3, 5.3_

- [ ]* 5.1 Property test: セッション永続性
  - **Property 7: Session persistence**
  - **Validates: Requirements 1.3, 5.3**

- [ ] 6. Frontend: CallModePageへの統合
  - SenderAddressSelectorをEmail送信UIに追加
  - 選択された送信元アドレスを状態管理
  - Email送信時に選択された送信元アドレスをAPIに送信
  - 送信確認メッセージに送信元アドレスを表示
  - _Requirements: 1.1, 1.3, 1.4, 3.3, 3.4, 3.5, 5.1_

- [ ]* 6.1 Integration test: CallModePageでのEmail送信
  - 送信元アドレスを選択してEmailを送信
  - 正しい送信元アドレスでEmailが送信されることを確認
  - 活動ログに送信元アドレスが記録されることを確認






- [x] 7. Frontend: GmailDistributionButtonへの統合
  - SenderAddressSelectorをGmail配信UIに追加
  - 選択された送信元アドレスを状態管理（セッションストレージ使用）
  - BuyerFilterSummaryModalに送信元アドレス選択UIを追加
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7.4 Frontend: EmailTemplateSelectorに送信元選択機能を追加
  - EmailTemplateSelectorモーダルの上部に送信元アドレス選択ドロップダウンを追加
  - デフォルトで"tenant@ifoo-oita.com"を選択
  - 選択された送信元アドレスをpropsとして親コンポーネントに渡す
  - GmailDistributionButtonで送信元アドレスを管理し、EmailTemplateSelectorとBuyerFilterSummaryModalの両方に渡す
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 7.5 Frontend: Gmail配信ボタンから直接メール送信機能を実装
  - GmailDistributionButtonを更新して、Gmail URLを開く代わりに既存のメール送信APIを呼び出す
  - 選択された送信元アドレスを`from`パラメータとしてAPIに渡す
  - 複数の買主に対してメールを一括送信
  - 送信中のローディング表示を追加
  - 送信成功/失敗のフィードバックを表示
  - BuyerFilterSummaryModalに送信元アドレスと送信先件数を表示
  - _Requirements: 6.4, 6.5, 7.4, 7.5, 7.6_

- [ ]* 7.1 Property test: 直接メール送信の送信元アドレス
  - **Property 10: Direct email sending with correct sender**
  - **Validates: Requirements 6.4**

- [ ]* 7.2 Property test: クロスコンテキスト一貫性
  - **Property 8: Cross-context consistency**
  - **Validates: Requirements 5.1, 5.2**

- [ ]* 7.3 Unit test: GmailDistributionButtonコンポーネント
  - デフォルトアドレスが選択されていることを確認
  - 送信元アドレスがGmail URLに含まれることを確認
  - セッションストレージから選択が復元されることを確認

- [ ] 8. Checkpoint - Task 7.5の実装確認
  - Task 7.5が完了したことを確認
  - Gmail配信時にメール本文にリマインダーが表示されることを確認
  - BuyerFilterSummaryModalに警告表示が追加されることを確認
  - ユーザーに質問があれば尋ねる

- [ ] 9. Documentation: 実装完了ドキュメントの作成
  - 実装内容のサマリー
  - 使用方法のガイド
  - Gmail技術的制限とリマインダー方式の説明
  - トラブルシューティング
  - _Requirements: All_

