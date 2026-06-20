# Property Details同期修正 - 要件定義

## 1. 概要

### 1.1 背景
公開物件サイト一覧において、AA12608などの物件でコメント類（お気に入り、おすすめ、こちらの物件について）が表示されない問題が発生しています。

調査の結果、以下の問題が判明しました：

1. **`PropertyListingSyncService.ts`の768行目で`updatePropertyDetailsFromSheets()`がコメントアウトされている**
2. **理由**: `sellersテーブルのcommentsカラムエラー`を回避するため
3. **結果**: `property_details`テーブルの`property_about`カラムが空のまま

### 1.2 現在の状態（AA12608の例）

**property_detailsテーブル**:
- ✅ `recommended_comments`: あり（13行）
- ✅ `favorite_comment`: あり
- ❌ `property_about`: **なし**（これが問題）
- ❌ `athome_data`: なし

**サービスで実際に取得**:
- ✅ PropertyService: 取得成功（29文字）
- ✅ RecommendedCommentService: 取得成功（13行）
- ✅ FavoriteCommentService: 取得成功

**結論**: データは取得できるが、`property_details`テーブルに保存されていない。

### 1.3 目的
`PropertyListingSyncService`の同期処理を修正し、すべてのコメントデータが正しく`property_details`テーブルに保存されるようにする。

---

## 2. ユーザーストーリー

### 2.1 物件管理者として
**As a** 物件管理者  
**I want** 物件リストスプレッドシートを更新したときに、コメントデータが自動的にデータベースに同期される  
**So that** 公開物件サイトで最新のコメントが表示される

### 2.2 サイト訪問者として
**As a** 公開物件サイトの訪問者  
**I want** すべての物件で「こちらの物件について」「おすすめコメント」「お気に入り文言」が表示される  
**So that** 物件の詳細情報を確認できる

---

## 3. 受け入れ基準

### 3.1 同期処理の修正

#### 3.1.1 `updatePropertyDetailsFromSheets()`の有効化
- [ ] `PropertyListingSyncService.ts`の768行目のコメントアウトを解除
- [ ] `sellersテーブルのcommentsカラムエラー`の原因を特定
- [ ] エラーを修正または回避する方法を実装

#### 3.1.2 エラーハンドリングの改善
- [ ] `updatePropertyDetailsFromSheets()`内で発生するエラーを適切にキャッチ
- [ ] エラーが発生しても同期処理全体が停止しないようにする
- [ ] エラーログを詳細に記録する

### 3.2 既存物件の再同期

#### 3.2.1 再同期スクリプトの作成
- [ ] `property_about`が空の物件を検出するスクリプトを作成
- [ ] 検出された物件のコメントデータを再取得して保存するスクリプトを作成
- [ ] バッチ処理で複数物件を効率的に処理

#### 3.2.2 AA12608の修正確認
- [ ] AA12608の`property_about`が正しく保存される
- [ ] AA12608の公開物件サイトで「こちらの物件について」が表示される

### 3.3 テストと検証

#### 3.3.1 単体テスト
- [ ] `updatePropertyDetailsFromSheets()`が正常に動作することを確認
- [ ] エラーが発生した場合の挙動を確認
- [ ] 各サービス（PropertyService、RecommendedCommentService、FavoriteCommentService）が正常に動作することを確認

#### 3.3.2 統合テスト
- [ ] 物件リストスプレッドシートを更新したときに、コメントデータが自動的に同期される
- [ ] 新規物件追加時にコメントデータが正しく保存される
- [ ] 既存物件更新時にコメントデータが正しく更新される

#### 3.3.3 本番環境での検証
- [ ] AA12608を含む複数の物件で、コメントデータが正しく表示される
- [ ] 同期処理のパフォーマンスが許容範囲内である
- [ ] エラーログに異常がない

---

## 4. 技術的制約

### 4.1 データベース
- Supabase PostgreSQL
- `property_details`テーブルのスキーマは変更しない
- `sellers`テーブルの`comments`カラムの問題を解決する必要がある

### 4.2 スプレッドシート
- Google Sheets API
- 業務リスト（業務依頼シート）から個別物件スプレッドシートURLを取得
- 個別物件スプレッドシートの`athome`シートからコメントを取得

### 4.3 パフォーマンス
- Google Sheets APIのレート制限を考慮（バッチ間に1秒待機）
- 大量の物件を処理する場合はバッチ処理を使用

---

## 5. 非機能要件

### 5.1 信頼性
- 同期処理中にエラーが発生しても、処理全体が停止しない
- エラーが発生した物件は記録され、後で再試行できる

### 5.2 保守性
- コードは読みやすく、理解しやすい
- エラーメッセージは詳細で、問題の特定が容易

### 5.3 パフォーマンス
- 同期処理は10分以内に完了する（100物件の場合）
- APIレート制限を超えない

---

## 6. 除外事項

以下は本Specの対象外です：

- フロントエンドの表示ロジックの変更
- `property_listings`テーブルのスキーマ変更
- 新しいコメントタイプの追加
- 画像データの同期

---

## 7. 依存関係

### 7.1 既存のサービス
- `PropertyService`: 「こちらの物件について」を取得
- `RecommendedCommentService`: おすすめコメントを取得
- `FavoriteCommentService`: お気に入り文言を取得
- `PropertyDetailsService`: `property_details`テーブルへの保存
- `GyomuListService`: 業務リストから個別物件スプレッドシートURLを取得

### 7.2 環境変数
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`
- `GYOMU_LIST_SPREADSHEET_ID`

---

## 8. リスクと対策

### 8.1 リスク: `sellers`テーブルの`comments`カラムエラー
**対策**: 
- エラーの原因を特定する
- `PropertyDetailsService`を使用して`property_details`テーブルに直接保存する（`sellers`テーブルを経由しない）

### 8.2 リスク: Google Sheets APIのレート制限
**対策**:
- バッチ処理を使用
- バッチ間に1秒待機
- エラーが発生した場合は再試行

### 8.3 リスク: 大量の物件を処理する際のタイムアウト
**対策**:
- バッチサイズを調整（現在は10件/バッチ）
- 進捗状況をログに記録
- 中断した場合は途中から再開できるようにする

---

## 9. 成功の指標

### 9.1 定量的指標
- [ ] `property_about`が空の物件が0件になる
- [ ] 同期処理のエラー率が5%以下
- [ ] 同期処理の完了時間が10分以内（100物件の場合）

### 9.2 定性的指標
- [ ] 公開物件サイトですべてのコメントが正しく表示される
- [ ] 物件管理者がスプレッドシートを更新したときに、自動的に同期される
- [ ] エラーログが読みやすく、問題の特定が容易

---

## 10. 次のステップ

1. **設計フェーズ**: 詳細な設計ドキュメントを作成
2. **実装フェーズ**: コードを修正し、テストを実施
3. **検証フェーズ**: 本番環境で動作を確認
4. **デプロイフェーズ**: 本番環境にデプロイ

---

## 11. 参考情報

### 11.1 関連ファイル
- `backend/src/services/PropertyListingSyncService.ts` (768行目)
- `backend/src/services/PropertyService.ts`
- `backend/src/services/RecommendedCommentService.ts`
- `backend/src/services/FavoriteCommentService.ts`
- `backend/src/services/PropertyDetailsService.ts`

### 11.2 関連ドキュメント
- `spreadsheet-configuration.md`: スプレッドシート設定ガイド
- `spreadsheet-column-mapping.md`: スプレッドシートカラム名マッピング

### 11.3 調査結果
- `backend/check-aa12608-comments.ts`: AA12608の調査スクリプト
- 調査結果: `property_details`テーブルの`property_about`が空
