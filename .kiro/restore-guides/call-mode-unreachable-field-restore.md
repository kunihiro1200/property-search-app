# 通話モード「不通」フィールド復元ガイド

## 📋 機能概要

通話モードページに「不通」フィールドを追加し、スプレッドシートと自動同期する機能。

### 主な機能
- ボタンスタイルのUI（不通：赤、通電OK：青）
- inquiry_date >= 2026-01-01の売主のみ表示
- 必須フィールド（赤いアスタリスク）
- 通話メモなしでも保存可能
- スプレッドシート列J（不通）に自動同期

---

## 🔧 実装内容

### 1. データベース
- テーブル: `sellers`
- カラム: `unreachable_status VARCHAR(20) NULL`
- CHECK制約: `('不通', '通電OK', NULL)`
- マイグレーションファイル: `backend/supabase/migrations/20260128_add_unreachable_status_column.sql`

### 2. バックエンド
- **SellerService**: `backend/src/services/SellerService.supabase.ts`
  - `decryptSeller`メソッドに`unreachableStatus`フィールド追加（line 1074付近）
  - `updateSeller`メソッドに`unreachable_status`更新処理追加（line 442-445付近）
- **型定義**: `backend/api/src/types/index.ts`
  - `Seller`インターフェースに`unreachableStatus?: string | null`追加
- **バリデーション**: `backend/api/src/routes/sellers.ts`
  - 有効値チェック（'不通', '通電OK'）
- **スプレッドシート同期**: `backend/src/routes/sellers.ts`
  - SyncQueue初期化処理（line 13-50付近）
- **カラムマッピング**: `backend/src/config/column-mapping.json`
  - `"不通": "unreachable_status"` マッピング設定済み

### 3. フロントエンド
- **CallModePage**: `frontend/src/pages/CallModePage.tsx`
  - UIコンポーネント（line 4270-4312付近）
  - 状態管理: `unreachableStatus` state（line 119付近）
  - データロード: `setUnreachableStatus(sellerData.unreachableStatus || null)`（line 670付近）
  - 保存ロジック: `handleSaveAndExit`関数（line 987-1040付近）
  - 保存ボタン有効化条件（line 4312-4327付近）

---

## 🚨 壊れた時の症状

### 症状1: 「不通」フィールドが表示されない
- CallModePageのUIコンポーネントが削除された
- inquiry_date条件が削除された

### 症状2: データが保存されない
- SellerServiceの`updateSeller`メソッドから`unreachable_status`処理が削除された
- バックエンドのバリデーションが削除された

### 症状3: スプレッドシートに同期されない
- SyncQueueの初期化が削除された（`backend/src/routes/sellers.ts`）
- カラムマッピングが削除された

---

## 🔄 復元方法

### 次回の復元依頼の仕方

```
通話モードの「不通」フィールドが壊れた。
.kiro/restore-guides/call-mode-unreachable-field-restore.md を見て復元して。
```

または

```
「不通」フィールドが表示されない/保存されない/同期されない。
復元ガイドを確認して修正して。
```

---

## 📝 重要なファイル一覧

### バックエンド
1. `backend/supabase/migrations/20260128_add_unreachable_status_column.sql` - マイグレーション
2. `backend/src/services/SellerService.supabase.ts` - データ処理（line 442-445, 1074）
3. `backend/src/routes/sellers.ts` - SyncQueue初期化（line 13-50）
4. `backend/src/config/column-mapping.json` - スプレッドシートマッピング
5. `backend/api/src/types/index.ts` - 型定義（line 68）
6. `backend/api/src/routes/sellers.ts` - バリデーション

### フロントエンド
1. `frontend/src/pages/CallModePage.tsx` - UI実装（line 119, 670, 987-1040, 4270-4327）

---

## ✅ 動作確認方法

### 1. データベース確認
```sql
SELECT unreachable_status FROM sellers WHERE seller_number = 'AA13472';
```

### 2. バックエンドログ確認
```
✅ SyncQueue initialized and set for SellerService
```

### 3. フロントエンド確認
- 通話モードページを開く
- inquiry_date >= 2026-01-01の売主で「不通」フィールドが表示される
- 「不通」または「通電OK」を選択して保存
- スプレッドシートの列J（不通）に反映される

### 4. スプレッドシート同期確認
```bash
cd backend
npx tsx test-unreachable-spreadsheet-sync.ts
```

期待される出力:
```
✅ SUCCESS: Data is synced correctly!
```

---

## 🎯 仕様詳細

### UIルール
- ボタンスタイル（ラジオボタンではない）
- 「不通」: 赤色（selected時はcontained variant）
- 「通電OK」: 青色（selected時はcontained variant）
- ボタンサイズ: `minWidth: 120px`, `maxWidth: 400px`
- 必須フィールド（赤いアスタリスク表示）
- inquiry_date >= 2026-01-01の売主のみ表示

### 保存ルール
- 通話メモなしでも保存可能
- 「不通」または「通電OK」のみで保存可能
- 保存ボタンは以下の条件で有効化:
  - 通話メモがある、または
  - unreachableStatusがある（inquiry_date >= 2026-01-01の場合）

### スプレッドシート同期
- 自動同期（売主更新時に自動実行）
- スプレッドシート列J（不通）に同期
- 値: '不通', '通電OK', または空白

---

## 🔍 トラブルシューティング

### 問題1: SyncQueueが初期化されない
**原因**: `backend/src/routes/sellers.ts`の初期化コードが削除された

**解決策**:
```typescript
// backend/src/routes/sellers.ts の先頭に追加
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';
import { SpreadsheetSyncService } from '../services/SpreadsheetSyncService';
import { SyncQueue } from '../services/SyncQueue';
import supabase from '../config/supabase';

const initializeSyncQueue = async () => {
  // ... 初期化コード
};

initializeSyncQueue().catch(error => {
  console.error('❌ Unhandled error in initializeSyncQueue:', error);
});
```

### 問題2: データベースに保存されない
**原因**: SellerServiceの`updateSeller`メソッドから処理が削除された

**解決策**: `backend/src/services/SellerService.supabase.ts`の`updateSeller`メソッドに以下を追加:
```typescript
if ((data as any).unreachableStatus !== undefined) {
  console.log('🔍 Updating unreachable_status:', {
    sellerId,
    value: (data as any).unreachableStatus,
  });
  updates.unreachable_status = (data as any).unreachableStatus;
}
```

### 問題3: フロントエンドに表示されない
**原因**: CallModePageのUIコンポーネントが削除された

**解決策**: `frontend/src/pages/CallModePage.tsx`のline 4270-4312付近のコードを復元

---

## 📚 関連ドキュメント

- Spec: `.kiro/specs/call-mode-unreachable-field/`
  - `requirements.md` - 要件定義
  - `design.md` - 設計書
  - `tasks.md` - タスクリスト
- Steering: `.kiro/steering/backend-architecture.md` - バックエンドアーキテクチャ

---

**最終更新日**: 2026年1月28日  
**作成理由**: 通話モード「不通」フィールド機能の実装完了  
**バージョン**: 1.0.0
