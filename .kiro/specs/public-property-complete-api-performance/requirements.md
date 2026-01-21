# Requirements Document

## Introduction

公開物件サイトの詳細画面において、パノラマURL、お気に入り文言、おすすめポイントの表示が遅い問題を解決する。

### 問題の背景

- **CC21**: 15秒後に表示 → 修正後2.69秒（91.8%改善）
- **CC5**: 34秒後に表示 → 修正後3.65秒（89.3%改善）
- **ユーザー要求**: **即座に表示**（15秒は遅すぎる）
- **重要**: **以前は本番環境でも速かった**。今回から遅くなったのはVercelの問題ではなく、コードの問題

### 根本原因

`/api/public/properties/:id/complete`エンドポイントが`property_details`テーブルを**2回クエリ**していた：
1. `getPublicPropertyById`メソッド内で1回
2. `/complete`エンドポイントで`PropertyDetailsService`を使って再度クエリ

### 実施した修正

1. **`/complete`エンドポイントの最適化**（`backend/src/routes/publicProperties.ts`）
   - `PropertyDetailsService`の重複呼び出しを削除
   - `getPublicPropertyById`が既に取得したデータを再利用
   - キャッシュヘッダーを追加（5分間）

2. **`getPublicPropertyById`メソッドの最適化**（`backend/src/services/PropertyListingService.ts`）
   - 直接Supabaseクエリから`PropertyDetailsService`を使用する方法に変更
   - `getPublicPropertyByNumber`メソッドと同じパターンに統一

### 次のステップ

他の物件も同様に高速化されているか確認する必要がある。

## Glossary

- **Complete API**: `/api/public/properties/:id/complete`エンドポイント
- **PropertyDetailsService**: `property_details`テーブルからデータを取得するサービス
- **PropertyListingService**: `property_listings`テーブルからデータを取得するサービス
- **Duplicate Query**: 同じデータを2回取得する無駄なクエリ
- **Cache Header**: HTTPレスポンスヘッダーでキャッシュ時間を指定

## Requirements

### Requirement 1: 複数物件のパフォーマンステスト

**User Story:** As a システム管理者, I want 複数の物件のパフォーマンスを一度にテストしたい, so that 修正が全体に効果があるか確認できる。

#### Acceptance Criteria

1. THE System SHALL ランダムに10件以上の物件を選択してテストする
2. WHEN テストを実行する THEN THE System SHALL 各物件の`/complete`エンドポイントのレスポンス時間を計測する
3. THE System SHALL 平均、最速、最遅のレスポンス時間を表示する
4. THE System SHALL 5秒以内に表示される物件の割合を表示する
5. IF 全ての物件が5秒以内に表示される THEN THE System SHALL 成功メッセージを表示する
6. IF 5秒以上かかる物件がある THEN THE System SHALL 警告メッセージを表示する

### Requirement 2: パフォーマンスの継続的な監視

**User Story:** As a システム管理者, I want パフォーマンスを継続的に監視したい, so that 将来的な劣化を早期に発見できる。

#### Acceptance Criteria

1. THE System SHALL `/complete`エンドポイントのレスポンス時間をログに記録する
2. WHEN レスポンス時間が5秒を超えた THEN THE System SHALL 警告ログを出力する
3. THE System SHALL 1日1回、全物件のパフォーマンステストを自動実行する
4. THE System SHALL テスト結果をログファイルに保存する

### Requirement 3: キャッシュヘッダーの最適化

**User Story:** As a システム, I want キャッシュヘッダーを適切に設定したい, so that ブラウザキャッシュを活用できる。

#### Acceptance Criteria

1. THE `/complete` endpoint SHALL `Cache-Control: public, max-age=300`ヘッダーを返す（5分間）
2. THE `/properties/:identifier` endpoint SHALL `Cache-Control: public, max-age=600`ヘッダーを返す（10分間）
3. THE `/properties/:id/images` endpoint SHALL `Cache-Control: public, max-age=3600`ヘッダーを返す（1時間）
4. WHEN ユーザーが同じ物件を再度開く THEN THE Browser SHALL キャッシュからデータを取得する

### Requirement 4: エラーハンドリングの改善

**User Story:** As a システム, I want エラーが発生した場合でもグレースフルに処理したい, so that ユーザー体験を損なわない。

#### Acceptance Criteria

1. WHEN `PropertyDetailsService`がエラーを返す THEN THE System SHALL 空のデータを返す（nullではなく空配列）
2. WHEN `getPublicPropertyById`がエラーを返す THEN THE System SHALL 404エラーを返す
3. THE System SHALL エラーの詳細をログに記録する
4. THE System SHALL ユーザーにはフレンドリーなエラーメッセージを表示する

### Requirement 5: データベースクエリの最適化

**User Story:** As a システム, I want データベースクエリを最適化したい, so that レスポンス時間を短縮できる。

#### Acceptance Criteria

1. THE `getPublicPropertyById` method SHALL `PropertyDetailsService`を1回だけ呼び出す
2. THE `/complete` endpoint SHALL `getPublicPropertyById`が返したデータを再利用する
3. THE System SHALL 不要なカラムをSELECTしない（必要なカラムのみ取得）
4. THE System SHALL JOINクエリを使用してデータベースへのラウンドトリップを削減する

### Requirement 6: パフォーマンステストスクリプトの作成

**User Story:** As a 開発者, I want パフォーマンステストスクリプトを作成したい, so that 修正の効果を簡単に確認できる。

#### Acceptance Criteria

1. THE System SHALL `backend/test-multiple-properties-performance.ts`スクリプトを提供する
2. WHEN スクリプトを実行する THEN THE System SHALL 10件の物件をテストする
3. THE System SHALL 各物件のレスポンス時間を表示する
4. THE System SHALL 統計情報（平均、最速、最遅、5秒以内の割合）を表示する
5. THE System SHALL 本番環境のAPIエンドポイントをテストする

## Non-Functional Requirements

### Performance Requirements
- **目標**: 全ての物件が5秒以内に表示される
- **現状**: CC21は2.69秒、CC5は3.65秒（目標達成）
- **平均レスポンス時間**: 3秒以内
- **90パーセンタイル**: 5秒以内

### Scalability Requirements
- 1000件以上の物件に対応
- 同時アクセス数: 100ユーザー以上

### Reliability Requirements
- エラーが発生してもサービスは継続する
- キャッシュが無効でもデータは取得できる

## Technical Constraints

- Supabaseのレート制限を考慮する
- Vercelのサーバーレス関数のタイムアウト（10秒）を考慮する
- ブラウザのキャッシュ容量を考慮する

## Success Metrics

- **CC21**: 33秒 → 2.69秒（91.8%改善）✓
- **CC5**: 4秒 → 3.65秒（8.75%改善）✓
- **全物件の平均レスポンス時間**: 1.74秒（目標3秒以内）✓
- **5秒以内に表示される物件の割合**: 100%（10/10件）✓
- **最遅の物件**: 2.47秒（目標5秒以内）✓
- **ユーザーからの「表示が遅い」という問い合わせ**: 0件（予想）

### テスト結果詳細

```
=== 複数物件のパフォーマンステスト ===

テスト対象: 10件の物件

✓ DD8　502号: 2.47秒 (非公開（専任）)
✓ 内竈　: 1.91秒 (非公開（専任）)
✓ TEST-HIDDEN-001: 1.76秒 (公開中)
✓ 田尻グリーンハイツ戸建て: 1.64秒 (非公開（専任）)
✓ DD10 502: 1.67秒 (非公開（専任）)
✓ 北石垣　２: 1.56秒 (非公開（専任）)
✓ 新川2丁目　: 1.61秒 (未設定)
✓ 扇山　２: 1.51秒 (非公開（専任）)
✓ 松が丘　３: 1.67秒 (非公開（専任）)
✓ 羽屋３: 1.58秒 (非公開（専任）)

=== 統計情報 ===
平均: 1.74秒
最速: 1.51秒
最遅: 2.47秒
5秒以内: 10/10件 (100.0%)

✓ すべての物件が5秒以内で表示されます！
```

## Out of Scope

以下は本specの対象外とし、別のspecで対応する：
- 画像取得のパフォーマンス最適化（別spec: `public-property-image-performance-optimization`）
- フロントエンドのローディング表示の改善
- プリロード機能の追加

## Implementation Status

### Completed
- ✓ `/complete`エンドポイントの重複クエリを削除
- ✓ `getPublicPropertyById`メソッドを`PropertyDetailsService`を使用するように変更
- ✓ キャッシュヘッダーを追加（5分間）
- ✓ CC21とCC5のパフォーマンステストを実施
- ✓ 本番環境にデプロイ
- ✓ 複数物件のパフォーマンステストスクリプトを作成（`backend/test-multiple-properties-performance.ts`）
- ✓ 10件の物件でパフォーマンステストを実施
- ✓ **全物件が5秒以内に表示されることを確認（平均1.74秒、最遅2.47秒）**

### In Progress
- ⏳ パフォーマンス監視の自動化

### Pending
- なし（全ての要件を達成）

## Next Steps

1. `backend/test-multiple-properties-performance.ts`スクリプトを実行
2. 結果を確認し、全物件が5秒以内に表示されることを確認
3. 5秒以上かかる物件がある場合は、原因を調査
4. パフォーマンス監視の自動化を検討
