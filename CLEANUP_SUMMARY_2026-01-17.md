# クリーンアップサマリー（2026-01-17）

## 削除したファイル（診断・テスト用）

以下のファイルは診断・テスト用のため削除しました：

### 診断スクリプト
- `backend/diagnose-performance-metrics-issue.ts`
- `backend/diagnose-zero-rates.ts`
- `backend/diagnose-competitor-loss-visited.ts`
- `backend/diagnose-valuation-email.ts`

### チェックスクリプト
- `backend/check-available-months.ts`
- `backend/check-actual-date-data.ts`
- `backend/check-spreadsheet-visit-acquisition-date.ts`
- `backend/check-visit-acquisition-sync-progress.ts`
- `backend/check-spreadsheet-visit-date.ts`

### テストスクリプト
- `backend/test-performance-metrics-november.ts`
- `backend/test-performance-metrics-2026-01.ts`

**理由**: これらは一時的な診断・テスト用で、本番環境では不要

## 移動したファイル（保持）

以下のファイルは`backend/scripts/sync/`に移動しました：

- `sync-visit-acquisition-dates.ts` → `backend/scripts/sync/sync-visit-acquisition-dates.ts`
- `sync-all-inquiry-fields.ts` → `backend/scripts/sync/sync-all-inquiry-fields.ts`

**理由**: 再実行が必要になる可能性があるため保持

## 保持したファイル（重要）

### 本番コード
- `backend/src/services/PerformanceMetricsService.ts` ✅ 修正済み
- `backend/src/config/column-mapping.json` ✅ 更新済み
- `frontend/src/components/PerformanceMetricsSection.tsx`

### マイグレーション
- `backend/migrations/009_step1_remove_constraint.sql` ✅ 実行済み
- `backend/migrations/009_step2_add_fields.sql` ✅ 実行済み
- `backend/migrations/009_step3_add_indexes_and_comments.sql` ✅ 実行済み
- `backend/migrations/082_expand_property_types.sql` ✅ 実行済み

### ドキュメント
- `SESSION_2026-01-17_PERFORMANCE_METRICS_FIX.md` - 詳細な修正履歴
- `QUICK_REFERENCE_PERFORMANCE_METRICS.md` - クイックリファレンス
- `CLEANUP_SUMMARY_2026-01-17.md` - このファイル

### その他の重要ファイル
- `backend/test-performance-metrics.ts` - 基本的なテストスクリプト（保持）
- `backend/sync-all-missing-properties.ts` - 物件データ同期（バックグラウンド実行中）

## 今後の管理

### 定期的に実行すべきスクリプト
1. `backend/scripts/sync/sync-visit-acquisition-dates.ts` - 訪問取得日の同期
2. `backend/scripts/sync/sync-all-inquiry-fields.ts` - 反響フィールドの同期

### 削除してよいファイル
- `backend/check-*.ts` - チェックスクリプト
- `backend/diagnose-*.ts` - 診断スクリプト
- `backend/test-*-specific.ts` - 特定月のテストスクリプト

### 絶対に削除してはいけないファイル
- `backend/src/services/PerformanceMetricsService.ts`
- `backend/migrations/*.sql`
- `backend/scripts/sync/*.ts`

## クリーンアップ実行日時
2026-01-17

## 次回セッション時の確認事項
1. 実績セクションが正常に動作しているか
2. データが正しく表示されているか
3. 読み込み時間が許容範囲内か（15-20秒）
