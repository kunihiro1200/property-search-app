# 買主削除同期機能 - タスクリスト

## Phase 1: BuyerServiceへの削除機能追加

### 1.1 BuyerService.delete()メソッドの実装
- [ ] `backend/src/services/BuyerService.ts`に`delete()`メソッドを追加
  - 買主の存在確認（`getByBuyerNumber()`）
  - 監査ログの記録（オプション）
  - データベースから物理削除（`DELETE FROM buyers WHERE buyer_number = ?`）
  - 削除された買主データを返す
  - エラーハンドリング（買主が存在しない場合、削除に失敗した場合）

### 1.2 削除機能のユニットテスト
- [ ] `backend/src/services/BuyerService.test.ts`に削除機能のテストを追加
  - 正常系: 買主が正しく削除される
  - 異常系: 買主が存在しない場合、エラーが発生する
  - 異常系: 削除に失敗した場合、エラーが発生する

## Phase 2: 削除同期スクリプトの実装

### 2.1 sync-deleted-buyers.tsの作成
- [ ] `backend/sync-deleted-buyers.ts`を作成
  - コマンドライン引数の解析（`--dry-run`オプション）
  - スプレッドシートから買主番号一覧を取得
  - データベースから買主番号一覧を取得
  - 削除対象を検出
  - 削除対象をリスト表示
  - ドライランモードの場合はここで終了
  - 確認プロンプトを表示
  - ユーザーが"yes"を入力した場合のみ削除を実行
  - 削除結果を表示

### 2.2 削除対象検出ロジックの実装
- [ ] `detectDeletedBuyers()`関数を実装
  - スプレッドシートの買主番号をSetに変換
  - データベースの買主番号をSetに変換
  - データベースにあるがスプレッドシートにない買主を検出
  - 削除対象の買主番号を配列で返す

### 2.3 確認プロンプトの実装
- [ ] `confirmDeletion()`関数を実装
  - 削除対象の買主数を表示
  - "Are you sure you want to delete {count} buyers? (yes/no): "を表示
  - ユーザー入力を取得
  - "yes"の場合はtrueを返す、それ以外はfalseを返す

### 2.4 削除実行ロジックの実装
- [ ] `executeDeletion()`関数を実装
  - 削除対象の買主をループ
  - `BuyerService.delete()`を呼び出して削除
  - 削除成功/失敗をカウント
  - 削除結果を表示

## Phase 3: Property-Based Testの実装

### 3.1 Property 1: 削除対象の正確性
- [ ] `backend/src/services/BuyerService.pbt.test.ts`を作成
  - Property 1のテストを実装
  - スプレッドシートに存在しない買主のみが削除対象として検出される

### 3.2 Property 2: 削除の完全性
- [ ] Property 2のテストを実装
  - 削除実行後、データベースとスプレッドシートの買主番号が一致する

### 3.3 Property 3: ドライランモードの安全性
- [ ] Property 3のテストを実装
  - ドライランモードでは削除が実行されない

### 3.4 Property 4: 削除の冪等性
- [ ] Property 4のテストを実装
  - 削除を複数回実行しても結果は同じ

## Phase 4: 統合テストと動作確認

### 4.1 ドライランモードのテスト
- [ ] `npx ts-node backend/sync-deleted-buyers.ts --dry-run`を実行
  - 削除対象の買主番号がリスト表示される
  - 削除は実行されない
  - データベースの買主数が変わらない

### 4.2 削除実行のテスト
- [ ] テスト用の買主をスプレッドシートから削除
- [ ] `npx ts-node backend/sync-deleted-buyers.ts`を実行
  - 削除対象の買主番号がリスト表示される
  - 確認プロンプトで"yes"を入力
  - 削除が実行される
  - 削除された買主数が表示される

### 4.3 削除後の確認
- [ ] `npx ts-node backend/check-deleted-buyers.ts`を実行
  - 削除対象の買主が0件であることを確認

### 4.4 整合性の確認
- [ ] データベースとスプレッドシートの買主数を比較
  - 買主数が一致することを確認
  - 買主番号が一致することを確認

## Phase 5: ドキュメント作成

### 5.1 README.mdの更新
- [ ] `backend/README.md`に削除同期機能の説明を追加
  - 使用方法
  - オプション（`--dry-run`）
  - 注意事項

### 5.2 ステアリングルールの作成
- [ ] `.kiro/steering/buyer-deletion-sync-rule.md`を作成
  - 削除同期の実行方法
  - 削除前の確認事項
  - 削除後の確認事項

## Phase 6: 将来の拡張（オプション）

### 6.1 自動同期サービスへの統合
- [ ]* `EnhancedAutoSyncService`に削除検出ロジックを追加
  - 5分ごとの自動同期で削除を検出
  - 削除対象が検出された場合、ログに出力
  - 自動削除は実行しない（手動確認が必要）

### 6.2 削除履歴の記録
- [ ]* `deleted_buyers`テーブルを作成
  - 削除された買主の履歴を記録
  - 削除日時、削除理由、削除者を記録

### 6.3 論理削除のサポート
- [ ]* `buyers`テーブルに`deleted_at`カラムを追加
  - 論理削除をサポート
  - 削除された買主を一定期間保持してから物理削除

---

**作成日**: 2026年2月14日  
**作成者**: Kiro AI  
**ステータス**: Ready for Implementation

**注意**: `[ ]*`は将来の拡張（オプション）タスクを示します。
