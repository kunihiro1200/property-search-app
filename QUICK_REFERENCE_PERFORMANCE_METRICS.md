# 実績セクション クイックリファレンス

## 🚨 緊急時の対応

### 実績データが0になった場合

1. **`confidence_level`フィルターを確認**
   ```typescript
   // backend/src/services/PerformanceMetricsService.ts
   // 以下のパターンで5箇所修正されているか確認
   .or('confidence_level.is.null,and(confidence_level.neq.D,confidence_level.neq.ダブり)')
   ```

2. **`visit_acquisition_date`を再同期**
   ```bash
   cd backend
   npx ts-node scripts/sync/sync-visit-acquisition-dates.ts
   ```

3. **バックエンドを再起動**
   ```bash
   cd backend
   npm run dev
   ```

### 他決割合が0になった場合

**原因**: `visit_date`ではなく`visit_acquisition_date`を使用する必要がある

**確認箇所**: `backend/src/services/PerformanceMetricsService.ts`の`calculateCompetitorLossVisited`メソッド

```typescript
// 正しい実装
const { data: totalData, error: totalError } = await this.table('sellers')
  .select('visit_assignee')
  .gte('visit_acquisition_date', startDate)  // ← visit_dateではない
  .lte('visit_acquisition_date', endDate)
  .not('visit_assignee', 'is', null)
  .neq('visit_assignee', '');
```

## 📊 データ同期

### 訪問取得日の同期
```bash
cd backend
npx ts-node scripts/sync/sync-visit-acquisition-dates.ts
```
- 対象: 1,338件
- 所要時間: 約1-2分

### 反響フィールドの同期
```bash
cd backend
npx ts-node scripts/sync/sync-all-inquiry-fields.ts
```
- 対象: inquiry_year, inquiry_site, inquiry_date, comments
- 所要時間: 約2-3分

## 🔍 動作確認

### テストスクリプト
```bash
cd backend
npx ts-node test-performance-metrics.ts
```

### 期待される結果（2026年1月）
- 訪問査定取得割合: 約29.6%
- 専任件数: 5件 (約17.2%)
- 他決割合（未訪問）: 約2.4%
- 他決割合（訪問済み）: 1件 (約3.6%)

## 📁 重要なファイル

### 本番コード
- `backend/src/services/PerformanceMetricsService.ts` - 実績計算ロジック
- `frontend/src/components/PerformanceMetricsSection.tsx` - UI

### 同期スクリプト
- `backend/scripts/sync/sync-visit-acquisition-dates.ts`
- `backend/scripts/sync/sync-all-inquiry-fields.ts`

### マイグレーション
- `backend/migrations/009_step1_remove_constraint.sql`
- `backend/migrations/009_step2_add_fields.sql`
- `backend/migrations/009_step3_add_indexes_and_comments.sql`
- `backend/migrations/082_expand_property_types.sql`

## 🐛 既知の問題

### 読み込み時間が長い（15-20秒）
- **原因**: 月平均計算で年度内の全ての月を個別にクエリ
- **対策**: 現状では避けられない（設計上の制約）
- **今後の改善**: キャッシュ、バッチ計算、インデックス追加

## 📝 データベーススキーマ

### 使用中のフィールド
- `confidence_level` - 確度（null, A, B, C, D, ダブり）
- `visit_acquisition_date` - 訪問取得日 ✅ 使用中
- `inquiry_date` - 反響日付
- `contract_year_month` - 契約年月
- `status` - 状況（当社）

### 未使用のフィールド
- `visit_date` - 訪問日 ❌ スプレッドシートで未使用（0件）

## 🔗 関連ドキュメント

詳細な修正履歴: `SESSION_2026-01-17_PERFORMANCE_METRICS_FIX.md`
