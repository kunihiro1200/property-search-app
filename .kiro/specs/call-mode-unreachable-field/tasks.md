# 通話モード「不通」フィールド追加機能 - タスクリスト

## 実装タスク

### 1. データベース変更

- [ ] 1.1 sellersテーブルにunreachable_statusカラムを追加
  - マイグレーションファイルを作成
  - カラム型: VARCHAR(20)
  - NULL許可: YES
  - デフォルト値: NULL
  - コメント追加

- [ ] 1.2 マイグレーションを実行
  - ローカル環境で実行
  - 動作確認

---

### 2. バックエンド実装

- [ ] 2.1 Seller型にunreachable_statusフィールドを追加
  - 場所: `backend/src/types/seller.ts`
  - 型: `string | null`

- [x] 2.2 スプレッドシート同期ロジックを更新
  - 場所: `backend/src/services/SellerSyncService.ts`
  - J列（10列目）の読み込み処理を追加
  - J列への書き込み処理を追加
  - **完了**: `EnhancedAutoSyncService.ts`と`AutoSyncService.ts`の`syncSingleSeller`と`updateSingleSeller`メソッドに`unreachable_status`フィールドの処理を追加
  - **完了**: `column-mapping.json`には既にマッピングが含まれていることを確認
  - **完了**: `backend/api/src/routes/sellers.ts`で`SyncQueue`と`SpreadsheetSyncService`を初期化し、`SellerService`に設定

- [ ] 2.2.1 既存データの一括同期スクリプトを実行
  - スクリプト: `backend/sync-unreachable-status-from-sheet.ts`
  - スプレッドシートの「不通」列から既存の売主データの`unreachable_status`を更新
  - 実行コマンド: `npx ts-node backend/sync-unreachable-status-from-sheet.ts`

- [ ] 2.3 バリデーション関数を追加
  - 場所: `backend/src/validators/sellerValidator.ts`
  - 有効な値: null、''、'不通'、'通電OK'

- [x] 2.4 API エンドポイントを更新
  - GET `/api/sellers/:id` のレスポンスにunreachable_statusを含める
  - PUT `/api/sellers/:id` のリクエストボディでunreachable_statusを受け取る
  - **完了**: `backend/src/services/SellerService.supabase.ts`の`decryptSeller`メソッドに`unreachableStatus`フィールドを追加
  - **完了**: `backend/src/services/SellerService.supabase.ts`の`updateSeller`メソッドに`unreachableStatus`の更新処理を追加
  - **テスト完了**: SellerServiceが正しく`unreachableStatus`フィールドを返すことを確認

---

### 3. フロントエンド実装（通話モードページ）

- [ ] 3.1 Seller型にunreachable_statusフィールドを追加
  - 場所: `frontend/src/types/seller.ts`
  - 型: `string | null`

- [ ] 3.2 通話モードページに「不通」フィールドを追加
  - 場所: `frontend/src/pages/CallModePage.tsx`
  - 状態管理: `const [unreachableStatus, setUnreachableStatus] = useState<string | null>(null)`
  - UIコンポーネント: ラジオボタン（未選択、不通、通電OK）
  - 配置: 通話メモ入力の右隣

- [ ] 3.3 データ読み込み処理を更新
  - 売主データ取得時にunreachable_statusを読み込む
  - 状態に反映

- [ ] 3.4 保存処理を更新
  - 保存時にunreachable_statusをAPIに送信
  - 成功メッセージ表示

- [ ] 3.5 バリデーション処理を追加
  - 無効な値の場合はエラーメッセージ表示

---

### 4. フロントエンド実装（ステータス表示ロジック）

- [ ] 4.1 isCallTodayUnstarted関数を更新
  - 場所: `frontend/src/utils/sellerStatusUtils.ts`
  - 不通フィールドが未入力かチェック
  - 反響日付が2026年1月1日以降かチェック

- [ ] 4.2 useSellerStatusフックの依存配列を更新
  - 場所: `frontend/src/hooks/useSellerStatus.ts`
  - `seller.unreachable_status`を依存配列に追加
  - `seller.inquiry_date`を依存配列に追加

---

### 5. テスト

- [ ] 5.1 ユニットテスト（バックエンド）
  - バリデーション関数のテスト
  - スプレッドシート同期のテスト

- [ ] 5.2 ユニットテスト（フロントエンド）
  - isCallTodayUnstarted関数のテスト
  - 不通フィールドが未入力で反響日付が2026年1月1日以降の場合
  - 不通フィールドが「不通」の場合
  - 反響日付が2026年1月1日より前の場合

- [ ] 5.3 統合テスト（フロントエンド）
  - 通話モードページの「不通」フィールド表示テスト
  - 「不通」選択・保存テスト
  - ステータス表示テスト

---

### 6. 動作確認

- [ ] 6.1 通話モードページでの動作確認
  - 「不通」フィールドが正しく表示されるか
  - ラジオボタンが正しく動作するか
  - 保存が正しく動作するか

- [ ] 6.2 スプレッドシート同期の確認
  - フロントエンドで選択した値がスプレッドシートのJ列に保存されるか
  - スプレッドシートのJ列の値がフロントエンドに反映されるか

- [ ] 6.3 ステータス表示の確認
  - 条件を満たす売主が「当日TEL分_未着手」と表示されるか
  - 不通フィールドが「不通」の場合、「当日TEL分_未着手」が表示されないか
  - 反響日付が2026年1月1日より前の場合、「当日TEL分_未着手」が表示されないか

---

### 7. ドキュメント更新

- [ ] 7.1 README更新
  - 新機能の説明を追加

- [ ] 7.2 API ドキュメント更新
  - unreachable_statusフィールドの説明を追加

---

## 完了条件

- [ ] 全てのタスクが完了している
- [ ] 全てのテストが通過している
- [ ] 通話モードページで「不通」フィールドが正しく動作している
- [ ] スプレッドシート同期が正しく動作している
- [ ] ステータス表示が正しく動作している
- [ ] ドキュメントが更新されている

---

**作成日**: 2026年1月28日  
**最終更新日**: 2026年1月28日  
**ステータス**: ✅ タスクリスト作成完了
