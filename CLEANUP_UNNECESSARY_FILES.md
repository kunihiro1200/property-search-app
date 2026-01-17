# 不要なファイル一覧

このセッションで作成された診断・テスト用のファイルで、今後不要なものをリストアップしています。

## 🗑️ 削除可能なファイル

### 診断スクリプト（一時的な確認用）
これらは問題解決のために作成された一時的な診断スクリプトです。削除しても問題ありません。

```
backend/check-confidence-column.ts
backend/check-employees-current-state.ts
backend/check-sellers-count.ts
backend/check-sellers-schema-direct.ts
backend/check-spreadsheet-columns.ts
backend/check-staff-spreadsheet.ts
```

### マイグレーション実行スクリプト（一時的）
マイグレーションは既にSupabase SQL Editorで実行済みのため、これらの実行スクリプトは不要です。

```
backend/migrations/run-087-direct.ts
backend/migrations/run-087-migration.ts
backend/migrations/verify-087-migration.ts
backend/migrations/run-090-auto.ts
backend/migrations/run-090-migration.ts
backend/migrations/run-091-fix.ts
```

### 古いマイグレーション関連ドキュメント
これらは作業中に作成された中間ドキュメントで、最終的な状態は`SESSION_RECOVERY_GUIDE.md`にまとめられています。

```
backend/migrations/087_COMPLETION_SUMMARY.md
backend/migrations/087_MANUAL_EXECUTION_GUIDE.md
backend/migrations/087_ROLLBACK_TEST_GUIDE.md
backend/migrations/087_verify.sql
backend/migrations/088_COMPLETION_SUMMARY.md
backend/migrations/088_MANUAL_EXECUTION_GUIDE.md
backend/migrations/089_COMPLETION_SUMMARY.md
backend/migrations/089_INVESTIGATION_PLAN.md
backend/migrations/098_EXECUTION_GUIDE.md
backend/migrations/CHECK_RLS_AND_DATA_FIXED.sql
backend/migrations/CURRENT_STATUS_SUMMARY.md
backend/migrations/EXECUTE_DIAGNOSTICS_NOW.md
backend/migrations/SYNC_SELLERS_GUIDE.md
backend/migrations/URGENT_ISSUES_SUMMARY.md
```

### 失敗したマイグレーション（使用されなかった）
これらは試行錯誤の過程で作成されたが、最終的に使用されなかったマイグレーションです。

```
backend/migrations/090_unified_schema_setup.sql
backend/migrations/091_URGENT_FIX.sql
```

### Spec関連（commentsカラム削除タスク）
このタスクは完了しているため、specファイルは参考資料として残すか削除するか選択できます。

**削除可能**:
```
.kiro/specs/remove-comments-column/tasks-confidence.md
```

**保持推奨**（将来の参考資料として）:
```
.kiro/specs/remove-comments-column/requirements.md
.kiro/specs/remove-comments-column/design.md
.kiro/specs/remove-comments-column/tasks.md
```

### その他の一時ファイル
```
backend/force-reload-sellers-schema.ts
```

## ✅ 保持すべき重要なファイル

### マイグレーションSQL（実行済み）
これらは実行済みですが、履歴として保持すべきです。

```
backend/migrations/087_remove_comments_from_sellers.sql
backend/migrations/092_recreate_sellers_no_constraints.sql
backend/migrations/094_DISABLE_RLS_SIMPLE.sql
backend/migrations/095_setup_seller_property_relationship.sql
backend/migrations/097_add_initials_to_employees.sql
backend/migrations/098_fix_employees_constraints.sql
```

### 同期スクリプト（今後も使用）
これらは今後もデータ同期に使用する可能性があります。

```
backend/sync-all-sellers-from-sheet.ts
backend/sync-staff-from-spreadsheet.ts
```

### ドキュメント（重要）
```
SESSION_RECOVERY_GUIDE.md  ← このセッションの完全な記録
CLEANUP_UNNECESSARY_FILES.md  ← このファイル
```

## 🔧 削除コマンド

以下のコマンドで不要なファイルを一括削除できます：

```bash
# 診断スクリプトを削除
rm backend/check-confidence-column.ts
rm backend/check-employees-current-state.ts
rm backend/check-sellers-count.ts
rm backend/check-sellers-schema-direct.ts
rm backend/check-spreadsheet-columns.ts
rm backend/check-staff-spreadsheet.ts
rm backend/force-reload-sellers-schema.ts

# マイグレーション実行スクリプトを削除
rm backend/migrations/run-087-direct.ts
rm backend/migrations/run-087-migration.ts
rm backend/migrations/verify-087-migration.ts
rm backend/migrations/run-090-auto.ts
rm backend/migrations/run-090-migration.ts
rm backend/migrations/run-091-fix.ts

# 古いマイグレーション関連ドキュメントを削除
rm backend/migrations/087_COMPLETION_SUMMARY.md
rm backend/migrations/087_MANUAL_EXECUTION_GUIDE.md
rm backend/migrations/087_ROLLBACK_TEST_GUIDE.md
rm backend/migrations/087_verify.sql
rm backend/migrations/088_COMPLETION_SUMMARY.md
rm backend/migrations/088_MANUAL_EXECUTION_GUIDE.md
rm backend/migrations/089_COMPLETION_SUMMARY.md
rm backend/migrations/089_INVESTIGATION_PLAN.md
rm backend/migrations/098_EXECUTION_GUIDE.md
rm backend/migrations/CHECK_RLS_AND_DATA_FIXED.sql
rm backend/migrations/CURRENT_STATUS_SUMMARY.md
rm backend/migrations/EXECUTE_DIAGNOSTICS_NOW.md
rm backend/migrations/SYNC_SELLERS_GUIDE.md
rm backend/migrations/URGENT_ISSUES_SUMMARY.md

# 失敗したマイグレーションを削除
rm backend/migrations/090_unified_schema_setup.sql
rm backend/migrations/091_URGENT_FIX.sql

# Spec関連（オプション）
rm .kiro/specs/remove-comments-column/tasks-confidence.md
```

## ⚠️ 注意事項

- マイグレーションSQLファイル（087, 092, 094, 095, 097, 098）は削除しないでください
- 同期スクリプト（sync-all-sellers-from-sheet.ts, sync-staff-from-spreadsheet.ts）は削除しないでください
- `SESSION_RECOVERY_GUIDE.md`は必ず保持してください

---

**作成日**: 2025年1月17日
