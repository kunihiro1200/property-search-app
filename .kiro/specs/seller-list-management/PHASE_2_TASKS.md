# Phase 2: Properties & Valuations - 実装タスク

## 概要

Phase 2では、物件情報管理と査定機能を実装します。Phase 1で構築した売主管理の基盤の上に、物件の詳細情報、自動査定エンジン、査定履歴管理を追加します。

## タスク一覧

### セクション1: データベーススキーマ作成 (5タスク)

#### タスクP2-1.1: propertiesテーブルのマイグレーション作成
**説明:** 物件情報を保存するpropertiesテーブルを作成する

**実装内容:**
- propertiesテーブルの作成
- 必要なカラムの定義
- CHECK制約の設定
- 外部キー制約の設定

**ファイル:** `backend/migrations/081_create_properties_and_valuations.sql`

**受入基準:**
- [ ] propertiesテーブルが作成される
- [ ] seller_idでsellersテーブルと紐付けられる
- [ ] property_typeのCHECK制約が設定される
- [ ] structureのCHECK制約が設定される

#### タスクP2-1.2: valuationsテーブルのマイグレーション作成
**説明:** 査定情報を保存するvaluationsテーブルを作成する

**実装内容:**
- valuationsテーブルの作成
- 必要なカラムの定義
- CHECK制約の設定
- 外部キー制約の設定

**ファイル:** `backend/migrations/081_create_properties_and_valuations.sql`

**受入基準:**
- [ ] valuationsテーブルが作成される
- [ ] property_idでpropertiesテーブルと紐付けられる
- [ ] seller_idでsellersテーブルと紐付けられる
- [ ] valuation_typeのCHECK制約が設定される


#### タスクP2-1.3: インデックスの作成
**説明:** クエリパフォーマンスを最適化するためのインデックスを作成する

**実装内容:**
- properties.seller_idにインデックス作成
- properties.property_typeにインデックス作成
- properties.addressに全文検索インデックス作成
- valuations.property_idにインデックス作成
- valuations.seller_idにインデックス作成
- valuations.created_atにインデックス作成（降順）

**ファイル:** `backend/migrations/081_create_properties_and_valuations.sql`

**受入基準:**
- [ ] 全てのインデックスが作成される
- [ ] 全文検索インデックスが正しく機能する

#### タスクP2-1.4: マイグレーション実行スクリプト作成
**説明:** マイグレーションを実行するスクリプトを作成する

**実装内容:**
- run-081-migration.tsの作成
- エラーハンドリングの実装
- ロールバック機能の実装

**ファイル:** `backend/migrations/run-081-migration.ts`

**受入基準:**
- [ ] マイグレーションが正常に実行される
- [ ] エラー時にロールバックされる
- [ ] 実行結果がログに記録される

#### タスクP2-1.5: マイグレーション検証スクリプト作成
**説明:** マイグレーションが正しく実行されたか検証するスクリプトを作成する

**実装内容:**
- verify-081-migration.tsの作成
- テーブル存在確認
- カラム存在確認
- インデックス存在確認
- 制約確認

**ファイル:** `backend/migrations/verify-081-migration.ts`

**受入基準:**
- [ ] 全てのテーブルが存在することを確認できる
- [ ] 全てのカラムが存在することを確認できる
- [ ] 全てのインデックスが存在することを確認できる
- [ ] 全ての制約が設定されていることを確認できる

### セクション2: PropertyService実装 (7タスク)

#### タスクP2-2.1: Property型定義
**説明:** 物件情報の型定義を作成する

**実装内容:**
- Property interfaceの定義
- PropertyType enumの定義
- Structure enumの定義
- SellerSituation enumの定義
- CreatePropertyRequest interfaceの定義
- UpdatePropertyRequest interfaceの定義

**ファイル:** `backend/src/types/index.ts`

**受入基準:**
- [ ] 全ての型が定義される
- [ ] TypeScriptのコンパイルエラーがない

#### タスクP2-2.2: PropertyService.createProperty実装
**説明:** 物件を作成する機能を実装する

**実装内容:**
- createProperty()メソッドの実装
- バリデーション
- データベースへの保存
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 物件が正常に作成される
- [ ] seller_idで売主と紐付けられる
- [ ] 作成日時と作成者が自動記録される
- [ ] バリデーションエラーが適切に処理される


#### タスクP2-2.3: PropertyService.getProperty実装
**説明:** 物件情報を取得する機能を実装する

**実装内容:**
- getProperty()メソッドの実装
- データベースからの取得
- 売主情報の結合
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 物件情報が正常に取得される
- [ ] 売主情報も一緒に取得される
- [ ] 存在しない物件IDの場合は404エラーを返す

#### タスクP2-2.4: PropertyService.updateProperty実装
**説明:** 物件情報を更新する機能を実装する（楽観的ロック対応）

**実装内容:**
- updateProperty()メソッドの実装
- 楽観的ロック（versionフィールド）の実装
- バリデーション
- データベースへの保存
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 物件情報が正常に更新される
- [ ] 更新日時と更新者が自動記録される
- [ ] versionが自動的にインクリメントされる
- [ ] 同時更新が検出された場合はエラーを返す

#### タスクP2-2.5: PropertyService.deleteProperty実装
**説明:** 物件を削除する機能を実装する

**実装内容:**
- deleteProperty()メソッドの実装
- カスケード削除の確認
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 物件が正常に削除される
- [ ] 関連する査定情報も削除される（CASCADE）
- [ ] 存在しない物件IDの場合は404エラーを返す

#### タスクP2-2.6: PropertyService.listProperties実装
**説明:** 物件リストを取得する機能を実装する

**実装内容:**
- listProperties()メソッドの実装
- ページネーション
- フィルタリング（物件種別、売主ID）
- ソート機能
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 物件リストが正常に取得される
- [ ] ページネーションが正しく機能する
- [ ] フィルタリングが正しく機能する
- [ ] ソートが正しく機能する

#### タスクP2-2.7: PropertyService.searchProperties実装
**説明:** 物件を検索する機能を実装する

**実装内容:**
- searchProperties()メソッドの実装
- 住所での部分一致検索
- 全文検索インデックスの活用
- エラーハンドリング

**ファイル:** `backend/src/services/PropertyService.phase2.ts`

**受入基準:**
- [ ] 住所で部分一致検索ができる
- [ ] 検索結果が1秒以内に返される
- [ ] 全文検索インデックスが活用される

### セクション3: ValuationEngine実装 (4タスク)

#### タスクP2-3.1: ValuationEngine基本実装
**説明:** 査定エンジンの基本構造を実装する

**実装内容:**
- ValuationEngineクラスの作成
- 構造別単価の定義
- 計算係数の定義

**ファイル:** `backend/src/services/ValuationEngine.phase2.ts`

**受入基準:**
- [ ] ValuationEngineクラスが作成される
- [ ] 構造別単価が定義される
- [ ] 計算係数が定義される


#### タスクP2-3.2: 戸建て・土地の査定計算ロジック実装
**説明:** 戸建てと土地の査定額を自動計算するロジックを実装する

**実装内容:**
- calculateValuation()メソッドの実装
- 土地評価額の計算
- 建物評価額の計算（戸建ての場合）
- 減価率の計算
- 査定額1、2、3の計算
- 計算根拠の生成

**ファイル:** `backend/src/services/ValuationEngine.phase2.ts`

**受入基準:**
- [ ] 土地評価額が正しく計算される
- [ ] 建物評価額が正しく計算される
- [ ] 減価率が正しく計算される
- [ ] 査定額1、2、3が正しく計算される
- [ ] 計算根拠が生成される

#### タスクP2-3.3: 異常値チェック実装
**説明:** 査定額が異常値の場合に警告を表示する機能を実装する

**実装内容:**
- validateValuation()メソッドの実装
- 最低額チェック（< 1,000,000円）
- 最高額チェック（> 1,000,000,000円）
- 警告メッセージの生成

**ファイル:** `backend/src/services/ValuationEngine.phase2.ts`

**受入基準:**
- [ ] 査定額1が100万円未満の場合に警告が表示される
- [ ] 査定額3が10億円超の場合に警告が表示される
- [ ] 警告メッセージが適切に生成される

#### タスクP2-3.4: ユニットテスト作成
**説明:** ValuationEngineのユニットテストを作成する

**実装内容:**
- 戸建て査定の正常系テスト
- 土地査定の正常系テスト
- 異常値検出テスト
- エッジケーステスト

**ファイル:** `backend/src/services/__tests__/ValuationEngine.phase2.test.ts`

**受入基準:**
- [ ] 全てのテストが通過する
- [ ] テストカバレッジが80%以上

### セクション4: ValuationService実装 (5タスク)

#### タスクP2-4.1: Valuation型定義
**説明:** 査定情報の型定義を作成する

**実装内容:**
- Valuation interfaceの定義
- ValuationType enumの定義
- CreateValuationRequest interfaceの定義
- UpdateValuationRequest interfaceの定義
- ValuationCalculationResult interfaceの定義

**ファイル:** `backend/src/types/index.ts`

**受入基準:**
- [ ] 全ての型が定義される
- [ ] TypeScriptのコンパイルエラーがない

#### タスクP2-4.2: ValuationService.createValuation実装
**説明:** 査定を作成する機能を実装する

**実装内容:**
- createValuation()メソッドの実装
- 自動計算（戸建て・土地）の実装
- 手入力（マンション）の実装
- データベースへの保存
- エラーハンドリング

**ファイル:** `backend/src/services/ValuationService.phase2.ts`

**受入基準:**
- [ ] 戸建て・土地の場合は自動計算される
- [ ] マンションの場合は手入力値が保存される
- [ ] 査定情報が正常に作成される
- [ ] 作成日時と作成者が自動記録される

#### タスクP2-4.3: ValuationService.getValuationHistory実装
**説明:** 査定履歴を取得する機能を実装する

**実装内容:**
- getValuationHistory()メソッドの実装
- 時系列順（新しい順）でのソート
- 作成者情報の結合
- エラーハンドリング

**ファイル:** `backend/src/services/ValuationService.phase2.ts`

**受入基準:**
- [ ] 査定履歴が時系列順で取得される
- [ ] 作成者情報も一緒に取得される
- [ ] 計算根拠も一緒に取得される


#### タスクP2-4.4: ValuationService.createPostVisitValuation実装
**説明:** 訪問後査定を作成する機能を実装する

**実装内容:**
- createPostVisitValuation()メソッドの実装
- valuation_typeを「訪問後」に設定
- データベースへの保存
- エラーハンドリング

**ファイル:** `backend/src/services/ValuationService.phase2.ts`

**受入基準:**
- [ ] 訪問後査定が正常に作成される
- [ ] valuation_typeが「訪問後」に設定される
- [ ] 過去の査定は保持される

#### タスクP2-4.5: ユニットテスト作成
**説明:** ValuationServiceのユニットテストを作成する

**実装内容:**
- 査定作成の正常系テスト
- 査定履歴取得のテスト
- 訪問後査定のテスト
- エラーケーステスト

**ファイル:** `backend/src/services/__tests__/ValuationService.phase2.test.ts`

**受入基準:**
- [ ] 全てのテストが通過する
- [ ] テストカバレッジが80%以上

### セクション5: API Routes実装 (6タスク)

#### タスクP2-5.1: Properties API routes実装
**説明:** 物件管理のAPIエンドポイントを実装する

**実装内容:**
- POST /api/properties
- GET /api/properties/:id
- PUT /api/properties/:id
- DELETE /api/properties/:id
- GET /api/properties
- GET /api/properties/search
- GET /api/sellers/:sellerId/properties

**ファイル:** `backend/src/routes/properties.ts`

**受入基準:**
- [ ] 全てのエンドポイントが実装される
- [ ] 認証ミドルウェアが適用される
- [ ] バリデーションが実装される
- [ ] エラーハンドリングが実装される

#### タスクP2-5.2: Valuations API routes実装
**説明:** 査定管理のAPIエンドポイントを実装する

**実装内容:**
- POST /api/valuations
- GET /api/valuations/:id
- PUT /api/valuations/:id
- GET /api/properties/:propertyId/valuations
- POST /api/valuations/calculate

**ファイル:** `backend/src/routes/valuations.ts`

**受入基準:**
- [ ] 全てのエンドポイントが実装される
- [ ] 認証ミドルウェアが適用される
- [ ] バリデーションが実装される
- [ ] エラーハンドリングが実装される

#### タスクP2-5.3: バリデーション実装
**説明:** リクエストデータのバリデーションを実装する

**実装内容:**
- 物件作成リクエストのバリデーション
- 物件更新リクエストのバリデーション
- 査定作成リクエストのバリデーション
- エラーメッセージの生成

**ファイル:** `backend/src/routes/properties.ts`, `backend/src/routes/valuations.ts`

**受入基準:**
- [ ] 必須フィールドのチェックが実装される
- [ ] データ型のチェックが実装される
- [ ] 範囲チェックが実装される
- [ ] 適切なエラーメッセージが返される

#### タスクP2-5.4: エラーハンドリング実装
**説明:** APIのエラーハンドリングを実装する

**実装内容:**
- 404エラーの処理
- 400エラーの処理
- 409エラー（楽観的ロック）の処理
- 500エラーの処理

**ファイル:** `backend/src/routes/properties.ts`, `backend/src/routes/valuations.ts`

**受入基準:**
- [ ] 全てのエラーケースが処理される
- [ ] 適切なHTTPステータスコードが返される
- [ ] エラーメッセージが分かりやすい

#### タスクP2-5.5: 統合テスト作成
**説明:** API routesの統合テストを作成する

**実装内容:**
- Properties APIの統合テスト
- Valuations APIの統合テスト
- エラーケースのテスト

**ファイル:** `backend/src/routes/__tests__/properties.test.ts`, `backend/src/routes/__tests__/valuations.test.ts`

**受入基準:**
- [ ] 全てのテストが通過する
- [ ] 全てのエンドポイントがテストされる

#### タスクP2-5.6: API ドキュメント作成
**説明:** APIのドキュメントを作成する

**実装内容:**
- OpenAPI/Swagger定義の作成
- リクエスト/レスポンスの例
- エラーレスポンスの例

**ファイル:** `backend/docs/api/phase2-properties-valuations.yaml`

**受入基準:**
- [ ] 全てのエンドポイントがドキュメント化される
- [ ] リクエスト/レスポンスの例が含まれる
- [ ] エラーレスポンスの例が含まれる

## チェックポイント

### チェックポイントP2-1: データベーススキーマ完了
**タイミング:** セクション1完了後

**確認項目:**
- [ ] propertiesテーブルが作成されている
- [ ] valuationsテーブルが作成されている
- [ ] 全てのインデックスが作成されている
- [ ] 全ての制約が設定されている
- [ ] マイグレーション検証スクリプトが通過する

**成功基準:**
- マイグレーションが正常に実行されること
- 検証スクリプトが全てのチェックを通過すること

### チェックポイントP2-2: PropertyService完了
**タイミング:** セクション2完了後

**確認項目:**
- [ ] 物件のCRUD操作が正常に動作する
- [ ] 楽観的ロックが正しく機能する
- [ ] 検索機能が正常に動作する
- [ ] 全てのユニットテストが通過する

**成功基準:**
- 物件管理の基本的なCRUD操作が全て正常に動作すること
- 楽観的ロックが同時更新を検出すること

### チェックポイントP2-3: ValuationEngine完了
**タイミング:** セクション3完了後

**確認項目:**
- [ ] 戸建て・土地の査定額が正しく計算される
- [ ] 異常値チェックが正しく機能する
- [ ] 計算根拠が正しく生成される
- [ ] 全てのユニットテストが通過する

**成功基準:**
- 査定額が仕様通りに計算されること
- 異常値が検出されること
- ユニットテストが全て通過すること

### チェックポイントP2-4: ValuationService完了
**タイミング:** セクション4完了後

**確認項目:**
- [ ] 査定の作成が正常に動作する
- [ ] 査定履歴の取得が正常に動作する
- [ ] 訪問後査定が正常に動作する
- [ ] 全てのユニットテストが通過する

**成功基準:**
- 査定管理の基本的な操作が全て正常に動作すること
- ユニットテストが全て通過すること

### チェックポイントP2-5: API Routes完了
**タイミング:** セクション5完了後

**確認項目:**
- [ ] 全てのAPIエンドポイントが正常に動作する
- [ ] バリデーションが正しく機能する
- [ ] エラーハンドリングが適切に実装されている
- [ ] 全ての統合テストが通過する

**成功基準:**
- 全てのAPIエンドポイントが仕様通りに動作すること
- 統合テストが全て通過すること

## 見積もり

### 開発期間（1人の開発者の場合）
- **セクション1:** 1日（8時間）
- **セクション2:** 2日（16時間）
- **セクション3:** 1日（8時間）
- **セクション4:** 1.5日（12時間）
- **セクション5:** 2.5日（20時間）

**合計:** 約8日（64時間）

### 並行開発の場合（2人の開発者）
- **開発者A:** セクション1, 2, 5.1
- **開発者B:** セクション3, 4, 5.2

**合計:** 約4-5日（32-40時間/人）

## 次のステップ

1. **Phase 2の実装開始:** セクション1から順番に実装を開始する
2. **Phase 3の計画:** Phase 2完了後、Phase 3（Activity Logs & Follow-ups）の計画を立てる

---

**Status**: 📝 Draft - Phase 2 Tasks
**Last Updated**: 2025-01-11
**Next Review**: Phase 2実装開始前
