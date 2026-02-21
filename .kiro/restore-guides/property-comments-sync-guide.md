# 物件コメントデータ同期ガイド（運用マニュアル）

## 📋 概要

このガイドでは、物件のコメントデータ（お気に入り文言、オススメコメント、内覧前コメント）を同期する方法を説明します。

---

## 🎯 いつ実行するか

### 自動同期（推奨）

**実行タイミング**: 
- `/complete`エンドポイントでコメントデータが空の場合、自動的に同期される
- ユーザーが物件詳細ページにアクセスした時に自動実行

**メリット**:
- 手動実行不要
- 常に最新のデータを取得

**デメリット**:
- レスポンス時間が長くなる（5-10秒）
- Google Sheets APIクォータ制限の影響を受けやすい

### 手動一括同期（初回のみ推奨）

**実行タイミング**:
- 初回セットアップ時
- 大量の物件のコメントデータが空になった時
- 定期メンテナンス時（月1回程度）

**メリット**:
- 一度に全物件のコメントデータを同期できる
- 自動同期の負荷を軽減

**デメリット**:
- 実行に時間がかかる（5-10分）
- Google Sheets APIクォータ制限に注意が必要

---

## 🚀 実行方法

### 方法1: 手動一括同期（初回セットアップ時）

**ステップ1: 対象物件数を確認**

```bash
npx ts-node backend/check-all-property-comments-status.ts
```

**出力例**:
```
✅ Found 1000 properties in property_details

📊 Summary:
- Total properties: 1000
- Has favorite_comment: 102 (10.2%)
- Has recommended_comments: 93 (9.3%)
- Empty comments: 852 (85.2%)
```

**ステップ2: 一括同期を実行**

```bash
npx ts-node backend/sync-all-property-comments.ts
```

**実行時間**: 約5-10分（対象物件数による）

**注意事項**:
- Google Sheets APIクォータ制限に注意
- 1分あたり60リクエストの制限があるため、3秒ごとに1物件ずつ同期
- クォータエラーが発生した場合は、10-15分待ってから再実行

**ステップ3: 結果を確認**

```bash
npx ts-node backend/check-all-property-comments-status.ts
```

**期待される結果**:
```
📊 Summary:
- Total properties: 1000
- Has favorite_comment: 150 (15.0%)
- Has recommended_comments: 140 (14.0%)
- Empty comments: 50 (5.0%)
```

---

### 方法2: 自動同期（通常運用時）

**設定**: 既に実装済み（`backend/api/index.ts`の`/complete`エンドポイント）

**動作**:
1. ユーザーが物件詳細ページにアクセス
2. コメントデータが空の場合、自動的にAthomeシートから同期
3. 同期後のデータを表示

**確認方法**:
```bash
# 本番環境で物件詳細ページにアクセス
https://property-site-frontend-kappa.vercel.app/public/properties/AA5564
```

**ログ確認**（Vercel）:
```
[Complete API] Syncing comments for AA5564...
[AthomeSheetSyncService] ✅ Successfully synced comments for AA5564
```

---

### 方法3: 個別物件の手動同期

**特定の物件のみを同期したい場合**:

```bash
# 例: CC100を同期
npx ts-node backend/sync-cc100-manual.ts
```

**スクリプトの作成方法**:
```typescript
// backend/sync-{物件番号}-manual.ts
import { AthomeSheetSyncService } from './src/services/AthomeSheetSyncService';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

async function sync物件番号() {
  const athomeSheetSyncService = new AthomeSheetSyncService();
  
  const success = await athomeSheetSyncService.syncPropertyComments(
    '物件番号',
    'detached_house' // または 'land', 'apartment'
  );
  
  console.log(success ? '✅ Success' : '❌ Failed');
}

sync物件番号().catch(console.error);
```

---

## 📊 同期対象の条件

### 必須条件

**`work_tasks`テーブルに`spreadsheet_url`が入っている物件のみ**

**理由**:
- `spreadsheet_url`がない物件は、個別物件スプレッドシートが存在しない
- 個別物件スプレッドシートがない場合、Athomeシートも存在しない
- Athomeシートがない場合、コメントデータを取得できない

### 同期対象外の物件

- `work_tasks`テーブルに存在しない物件
- `work_tasks`テーブルに存在するが、`spreadsheet_url`がNULLの物件

---

## 🚨 トラブルシューティング

### 問題1: Google Sheets APIクォータエラー

**症状**:
```
Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'
```

**原因**: 1分あたり60リクエストの制限を超えた

**解決策**:
1. **10-15分待つ**（クォータがリセットされるまで）
2. 待機時間を延長する（3秒 → 5秒）
3. 数時間後または翌日に実行する

**予防策**:
- 一括同期は夜間や早朝に実行する
- 同期間隔を3秒以上に設定する

---

### 問題2: 特定の物件の同期が失敗する

**確認方法**:
```bash
# 物件の状況を確認
npx ts-node backend/check-{物件番号}-status.ts
```

**確認項目**:
1. `work_tasks`に`spreadsheet_url`があるか？
2. `property_listings`に`property_type`があるか？
3. 個別物件スプレッドシートにAthomeシートがあるか？

**解決策**:
- `spreadsheet_url`がない場合: 業務リストに追加
- `property_type`が不明な場合: 物件リストを確認
- Athomeシートがない場合: 手動で作成

---

### 問題3: 同期後もコメントが表示されない

**確認方法**:
```bash
# データベースを確認
npx ts-node backend/check-{物件番号}-status.ts
```

**確認項目**:
1. `property_details`テーブルにデータが保存されているか？
2. `favorite_comment`、`recommended_comments`が空でないか？

**解決策**:
- データが保存されていない場合: 再同期
- データが空の場合: Athomeシートを確認

---

## 📝 KIROへの依頼方法

### 初回一括同期を実行したい場合

```
物件コメントの一括同期を実行して。
コマンド: npx ts-node backend/sync-all-property-comments.ts
```

### 同期状況を確認したい場合

```
物件コメントの同期状況を確認して。
コマンド: npx ts-node backend/check-all-property-comments-status.ts
```

### 特定の物件を同期したい場合

```
AA5564のコメントデータを同期して。
```

### Google Sheets APIクォータエラーが発生した場合

```
Google Sheets APIのクォータエラーが発生した。10分待ってから再実行して。
```

---

## 🎯 ベストプラクティス

### 1. 初回セットアップ時

**手順**:
1. 対象物件数を確認（`check-all-property-comments-status.ts`）
2. 夜間または早朝に一括同期を実行（`sync-all-property-comments.ts`）
3. 結果を確認（`check-all-property-comments-status.ts`）

### 2. 通常運用時

**手順**:
- 自動同期に任せる（`/complete`エンドポイント）
- 月1回程度、同期状況を確認
- 必要に応じて個別物件を手動同期

### 3. 定期メンテナンス時

**手順**:
1. 月1回、全物件の同期状況を確認
2. コメントデータが空の物件が多い場合、一括同期を実行
3. 失敗した物件を個別に調査

---

## 📅 推奨スケジュール

| タイミング | 作業内容 | コマンド |
|-----------|---------|---------|
| **初回セットアップ** | 一括同期 | `npx ts-node backend/sync-all-property-comments.ts` |
| **月1回** | 同期状況確認 | `npx ts-node backend/check-all-property-comments-status.ts` |
| **必要に応じて** | 一括同期 | `npx ts-node backend/sync-all-property-comments.ts` |
| **通常運用** | 自動同期 | （自動実行） |

---

## まとめ

**今後の運用方法**:

1. **初回**: 一括同期を実行（`sync-all-property-comments.ts`）
2. **通常**: 自動同期に任せる（`/complete`エンドポイント）
3. **定期**: 月1回、同期状況を確認（`check-all-property-comments-status.ts`）
4. **必要時**: 個別物件を手動同期

**このガイドに従うことで、効率的にコメントデータを管理できます。**

---

**最終更新日**: 2026年2月2日  
**作成理由**: 物件コメントデータの同期方法を明確化し、運用を効率化するため
