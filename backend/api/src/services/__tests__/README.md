# 統合テスト実行ガイド

## 📋 概要

このディレクトリには、物件リスト同期システムの統合テストが含まれています。

## 🎯 テストの目的

1. **完全同期フロー**: Google Sheetsからすべてのデータを同期
2. **選択同期フロー**: 特定の物件番号のみを同期
3. **エラーハンドリング**: エラー発生時の動作を検証
4. **並行処理**: 複数の同期操作の並行実行を検証

## 🔧 環境設定

### 必要な環境変数

テストを実行する前に、以下の環境変数を設定してください:

```bash
# Supabase設定（本番環境）
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Google Sheets設定
SPREADSHEET_ID=your-spreadsheet-id
SHEET_NAME=物件リスト

# テスト用設定（オプション）
TEST_SUPABASE_URL=https://test-project.supabase.co
TEST_SUPABASE_SERVICE_ROLE_KEY=test-service-role-key
TEST_SPREADSHEET_ID=test-spreadsheet-id
TEST_SHEET_NAME=テストシート
```

### テスト用環境の準備

#### 1. テスト用Supabaseプロジェクト（推奨）

本番環境とは別のテスト用プロジェクトを作成することを推奨します:

1. Supabaseダッシュボードで新しいプロジェクトを作成
2. 本番環境と同じスキーマを適用
3. `TEST_SUPABASE_URL`と`TEST_SUPABASE_SERVICE_ROLE_KEY`を設定

#### 2. テスト用Google Sheets（推奨）

本番データとは別のテスト用スプレッドシートを作成することを推奨します:

1. テスト用スプレッドシートを作成
2. テストデータを投入（10-100件程度）
3. サービスアカウントに共有権限を付与
4. `TEST_SPREADSHEET_ID`と`TEST_SHEET_NAME`を設定

## 🚀 テストの実行

### すべてのテストを実行

```bash
cd backend
npm test
```

### 統合テストのみを実行

```bash
npm test -- --testPathPattern=integration
```

### 特定のテストファイルを実行

```bash
npm test -- PropertyListingSync.integration.test.ts
```

### カバレッジレポート付きで実行

```bash
npm test -- --coverage
```

### ウォッチモードで実行

```bash
npm test -- --watch
```

### デバッグモードで実行

```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## 📊 テストの構成

### テストファイル

- `PropertyListingSync.integration.test.ts`: メインの統合テスト
- `helpers/testHelpers.ts`: テストヘルパー関数

### テストシナリオ

#### シナリオ1: 完全同期フロー

- Google Sheetsからすべての物件リストを同期
- 同期状態が正しく記録される
- 同期履歴が正しく記録される

**実行時間:** 約60秒  
**タイムアウト:** 60秒

#### シナリオ2: 選択同期フロー

- 特定の物件番号のみを同期
- 存在しない物件番号はスキップされる

**実行時間:** 約30秒  
**タイムアウト:** 60秒

#### シナリオ3: エラーハンドリング

- 無効な設定でエラーが発生する
- 同期中のエラーが適切に記録される

**実行時間:** 約30秒  
**タイムアウト:** 30秒

#### シナリオ4: 並行処理

- 複数の同期操作を並行して実行
- レート制限が機能する

**実行時間:** 約90秒  
**タイムアウト:** 120秒

## ✅ 成功基準

### テスト全体

- ✅ すべてのテストが合格
- ✅ テストカバレッジ > 80%
- ✅ テストが安定している（フレーキーでない）
- ✅ テストが高速に実行される（< 5分）

### 各テストシナリオ

- ✅ 期待される結果が得られる
- ✅ エラーが適切にハンドリングされる
- ✅ データの整合性が保たれる
- ✅ パフォーマンスが許容範囲内

## 🐛 トラブルシューティング

### 問題: テストが失敗する

**原因:**
- 環境変数が正しく設定されていない
- テスト用Supabaseプロジェクトが利用できない
- テストデータが不足している

**解決策:**
1. 環境変数を確認: `echo $SUPABASE_URL`
2. Supabaseプロジェクトの状態を確認
3. テストデータを確認

### 問題: テストが遅い

**原因:**
- テストデータが多すぎる
- ネットワークが遅い
- 並列実行が無効になっている

**解決策:**
1. テストデータを最小限にする（10-100件）
2. ネットワーク接続を確認
3. 並列実行を有効にする: `npm test -- --maxWorkers=4`

### 問題: カバレッジが低い

**原因:**
- テストされていないコードパスがある
- エッジケースのテストが不足している

**解決策:**
1. カバレッジレポートを確認: `npm test -- --coverage`
2. テストされていないコードを特定
3. 追加のテストケースを作成

### 問題: タイムアウトエラー

**原因:**
- テストの実行時間が長すぎる
- ネットワークが遅い

**解決策:**
1. タイムアウト時間を延長: `jest.setTimeout(120000)`
2. テストデータを減らす
3. ネットワーク接続を確認

## 📝 テストデータの管理

### テストデータの投入

テスト用スプレッドシートに以下のようなデータを投入してください:

```
物件番号 | 物件名 | 住所 | ...
TEST001 | テスト物件1 | 大分県大分市... | ...
TEST002 | テスト物件2 | 大分県別府市... | ...
...
```

### テストデータのクリーンアップ

テスト実行後、自動的にクリーンアップされます。
手動でクリーンアップする場合:

```typescript
import { cleanupTestData } from './helpers/testHelpers';

await cleanupTestData(supabase, syncId);
```

## 🔍 デバッグ

### ログの有効化

```bash
DEBUG=* npm test
```

### 特定のテストのみをデバッグ

```typescript
it.only('このテストのみを実行', async () => {
  // テストコード
});
```

### ブレークポイントの設定

```typescript
it('デバッグしたいテスト', async () => {
  debugger; // ここでブレークポイント
  // テストコード
});
```

## 📚 関連ドキュメント

- **Phase 4要件定義:** `../../specs/property-listing-sync-alternative-approach/PHASE_4_REQUIREMENTS.md`
- **Task 4.1詳細:** `../../specs/property-listing-sync-alternative-approach/PHASE_4_TASK_4.1_INTEGRATION_TESTS.md`
- **API仕様:** `../../specs/property-listing-sync-alternative-approach/API_DOCUMENTATION.md`

## 💡 ベストプラクティス

### テストの独立性

- 各テストは独立して実行できるようにする
- テスト間で状態を共有しない
- テストデータは各テストで準備・クリーンアップする

### テストの可読性

- テスト名は明確で説明的にする
- Arrange-Act-Assert パターンを使用する
- コメントで複雑なロジックを説明する

### テストの保守性

- 共通のロジックはヘルパー関数に抽出する
- マジックナンバーを避ける
- テストデータは定数として定義する

### テストのパフォーマンス

- 不要なデータベースアクセスを避ける
- 並列実行を活用する
- タイムアウトを適切に設定する

## 🎯 次のステップ

Task 4.1が完了したら、Task 4.2（負荷テスト）に進みます。

---

**作成日:** 2025-01-09  
**最終更新:** 2025-01-09  
**ステータス:** ✅ 実装完了
