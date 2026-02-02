# 物件コメントデータ自動同期ルール（絶対に守るべきルール）

## ⚠️ 最重要：業務リストのspreadsheet_urlが必須

物件のコメントデータ（お気に入り文言、オススメコメント、パノラマURL）を同期する際は、**必ず業務リスト（work_tasks）にspreadsheet_urlが入っている物件のみを対象にする**。

---

## 📋 自動同期の動作

### Phase 4.7: property_details同期

**実装**: `EnhancedAutoSyncService.syncMissingPropertyDetails()`

**実行タイミング**: **5分ごと**の自動同期で実行

**対象物件**:
1. `work_tasks`テーブルに`spreadsheet_url`が入っている物件
2. `property_details`テーブルにコメントデータが空の物件

**処理内容**:
1. `work_tasks`から`spreadsheet_url`が入っている物件を取得
2. これらの物件の`property_details`を確認
3. コメントデータが空の物件を検出
4. `AthomeSheetSyncService`を使用して個別物件スプレッドシートの`athome`シートから同期
5. バッチ処理（10件ずつ、3秒間隔）でAPIクォータを回避

---

## 🚨 同期対象外の物件

以下の物件は自動同期の対象外：
- `work_tasks`テーブルに存在しない物件
- `work_tasks`テーブルに存在するが、`spreadsheet_url`がNULLの物件

**理由**:
- `spreadsheet_url`がない物件は、個別物件スプレッドシートが存在しない
- 個別物件スプレッドシートがない場合、`athome`シートも存在しない
- `athome`シートがない場合、コメントデータを取得できない

---

## 📊 対象物件数の目安

**全物件数**: 約1,500件

**work_tasksにspreadsheet_urlがある物件**: 約150-200件

**自動同期対象（コメントデータが空）**: 約50-100件（初回のみ、以降は新規物件のみ）

**推定時間**: 約3-7分（1物件あたり2秒 × 50-100件）

---

## 🛠️ 手動同期（必要な場合のみ）

通常は自動同期で十分ですが、緊急時や大量の物件を一度に同期したい場合は手動で実行できます。

### 方法1: 全物件コメント同期スクリプト

```bash
# クォータ確認
npx ts-node backend/check-google-sheets-quota.ts

# 同期実行
npx ts-node backend/sync-all-property-comments.ts
```

### 方法2: 個別物件の同期

```typescript
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';

const athomeService = new AthomeSheetSyncService();
await athomeService.syncPropertyComments('AA13501', 'land');
```

---

## 📝 関連ファイル

| ファイル | 役割 |
|---------|------|
| `backend/src/services/EnhancedAutoSyncService.ts` | 自動同期サービス（Phase 4.7を含む） |
| `backend/src/services/AthomeSheetSyncService.ts` | Athomeシート同期サービス |
| `backend/src/services/PropertyDetailsService.ts` | 物件詳細サービス |
| `backend/sync-all-property-comments.ts` | 全物件コメント同期スクリプト（手動実行用） |
| `backend/check-google-sheets-quota.ts` | Google Sheets APIクォータ確認スクリプト |

---

## ✅ チェックリスト

新規物件を追加する際は、以下を確認：

- [ ] `work_tasks`テーブルに`spreadsheet_url`が登録されているか？
- [ ] 個別物件スプレッドシートに`athome`シートが存在するか？
- [ ] 自動同期が有効になっているか？（通常は有効）
- [ ] 5分以内に自動同期が実行されるのを待つ、または手動で同期を実行

---

## まとめ

**自動同期の動作**:

1. **5分ごと**に自動実行
2. **work_tasksにspreadsheet_urlがある物件のみ**を対象
3. **コメントデータが空の物件のみ**を同期
4. **バッチ処理**でAPIクォータを回避

**手動同期は通常不要**:
- 自動同期が5分ごとに実行されるため、手動同期は通常不要
- 緊急時のみ手動同期を実行

**このルールを徹底することで、無駄な同期処理を防ぎ、効率的にコメントデータを同期できます。**

---

**最終更新日**: 2026年2月2日  
**作成理由**: 全物件を同期しようとして時間がかかりすぎた問題を防ぐため  
**更新履歴**:
- 2026年2月2日: Phase 4.7の自動同期を再有効化、work_tasksフィルターを追加
