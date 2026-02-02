---
inclusion: manual
---

# 公開物件同期ルール（絶対に間違えないルール）

## ⚠️ 重要：正しい同期フロー

公開物件サイトに物件を同期する際は、以下の**正しい同期フロー**を必ず守ってください。

---

## ✅ 正しい同期フロー

### 1. **物件スプシ（物件リストスプレッドシート）に新規列が追加される** ← トリガー

**スプレッドシート名**: 物件リストスプレッドシート
**環境変数**: `PROPERTY_LISTING_SPREADSHEET_ID`
**シート名**: `物件` (環境変数: `PROPERTY_LISTING_SHEET_NAME`)

**重要なカラム**:
- `物件番号` - 物件の一意識別子
- **`atbb成約済み/非公開`** - 公開ステータス（**これが正しいカラム名**）
- `所在地` - 物件の住所（正しいカラム名）
- `住居表示（ATBB登録住所）` - 住居表示

---

## 🚨 最重要：atbb_statusの正しいカラム名

### ✅ 唯一の正しいカラム名

物件リストスプレッドシートの`atbb_status`フィールドの**正しいカラム名**は：

**`atbb成約済み/非公開`** ← これが唯一の正しいカラム名

### ❌ 間違ったカラム名（存在しない）

以下のカラム名は**存在しません**：

- ❌ `atbb_status` ← 存在しない
- ❌ `ATBB_status` ← 存在しない
- ❌ `ステータス` ← 存在しない
- ❌ `atbb_statue` ← 存在しない（タイポ）

**これらのカラム名を使用してはいけません。**

### ✅ 正しいコード

```typescript
// ✅ 正しい（最優先で「atbb成約済み/非公開」を使用）
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
  row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
  row['ステータス'] ||            // ← フォールバック（実際には存在しない）
  ''
);
```

**重要**: 
- **`row['atbb成約済み/非公開']`を最優先**にする
- フォールバックとして他のカラム名を含めるが、実際には存在しない

### 📊 実例：AA12398の問題

**問題**: AA12398が「成約済み」バッジになっている

**原因**: 間違ったカラム名を使用していた

```typescript
// ❌ 間違ったコード（修正前）
const atbbStatus = String(
  row['atbb_status'] ||      // ← 存在しないカラム名
  row['ATBB_status'] ||      // ← 存在しないカラム名
  row['ステータス'] ||        // ← 存在しないカラム名
  ''
);
```

**結果**: `atbbStatus`が空文字列になり、「成約済み」バッジが表示される

**解決策**: 正しいカラム名を最優先にする

```typescript
// ✅ 正しいコード（修正後）
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
  row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
  row['ステータス'] ||            // ← フォールバック（実際には存在しない）
  ''
);
```

**結果**: `atbbStatus`が`専任・公開前`になり、「公開前」バッジが表示される

### 🔍 カラム名の確認方法

```bash
# ヘッダー確認スクリプトを実行
npx ts-node backend/check-property-list-headers.ts
```

**出力例**:
```
📋 Headers:
  A列: 物件番号
  B列: 種別
  C列: atbb成約済み/非公開  ← これが正しいカラム名
  ...
```

### 2. **その物件スプシから`property_listings`テーブルを同期** ← メイン処理

**同期対象**:
- **基本的に全ての物件を同期**
- ⚠️ 注意: 「公開中のみ」という制限は、過去の大量同期時の一時的な措置
- 新規案件は`atbb_status`に関係なく全て同期する

**同期内容**:
- `property_number` - 物件番号
- `property_address` - 物件所在
- `atbb_status` - 公開ステータス
- `storage_location` - Google Driveフォルダ URL（自動取得）
- `spreadsheet_url` - 物件スプレッドシート URL（業務依頼シートから取得）

### 3. **業務依頼シートから「スプシURL」を取得して補完** ← 補助情報

**スプレッドシート名**: 業務依頼シート
**環境変数**: `GYOMU_LIST_SPREADSHEET_ID`
**シート名**: `業務依頼` (環境変数: `GYOMU_LIST_SHEET_NAME`)

**取得内容**:
- `スプシURL` - 物件スプレッドシートのURL

**この順番が重要です！**

---

## 🚨 絶対にやってはいけないこと

### ❌ 間違い1: 売主データを同期する

```typescript
// ❌ 絶対にやらない
const syncService = new EnhancedAutoSyncService();
await syncService.runFullSync(); // 売主データを同期してしまう
```

**理由**: 
- 売主データ（`sellers`テーブル）を同期するのは完全に間違い
- 物件リスト（`property_listings`テーブル）を同期すべき

### ❌ 間違い2: 業務依頼シートをメインソースにする

```typescript
// ❌ 間違ったフロー
// 1. 業務依頼シートから物件データを取得 ← 間違い
// 2. property_listingsテーブルに同期
```

**理由**:
- 業務依頼シートは補助情報（スプシURL）を取得するためのもの
- メインソースは物件リストスプレッドシート

### ❌ 間違い3: 特定の`atbb_status`だけを同期する

```typescript
// ❌ 不完全（新規案件は全て同期すべき）
const isPublic = atbbStatus.includes('公開中') || 
                atbbStatus.includes('公開前') || 
                atbbStatus.includes('非公開（配信メールのみ）');

if (!isPublic) {
  continue; // スキップしてしまう
}
```

**理由**:
- 新規案件は`atbb_status`に関係なく全て同期すべき
- 「公開中のみ」という制限は過去の大量同期時の一時的な措置
- 公開物件サイトでの表示フィルタリングは別途行う

---

## ✅ 正しい実装

### 実装ファイル

**ファイルパス**: `backend/api/src/services/PropertyListingSyncService.ts`

**主要メソッド**:
- `initialize()` - Google Sheets クライアントを初期化
- `runFullSync()` - フル同期を実行
- `getSpreadsheetUrlFromGyomuList()` - 業務依頼シートからスプシURLを取得

### Cronエンドポイント

**エンドポイント**: `/api/cron/sync-property-listings`
**実行頻度**: 15分ごと
**設定ファイル**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-property-listings",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

### 実装例

```typescript
// ✅ 正しい実装
export class PropertyListingSyncService {
  async runFullSync(triggeredBy: 'scheduled' | 'manual' = 'scheduled'): Promise<PropertyListingSyncResult> {
    // 1. 物件リストスプレッドシートからデータを取得（メインソース）
    const rows = await this.propertyListSheetsClient.readAll();
    
    for (const row of rows) {
      const propertyNumber = row['物件番号'];
      
      // ✅ 正しいカラム名「atbb成約済み/非公開」を最優先で使用
      const atbbStatus = String(
        row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
        row['atbb_status'] ||          // ← フォールバック（実際には存在しない）
        row['ATBB_status'] ||          // ← フォールバック（実際には存在しない）
        row['ステータス'] ||            // ← フォールバック（実際には存在しない）
        ''
      );
      
      // 2. 基本的に全ての物件を同期（atbb_statusでフィルタリングしない）
      console.log(`📝 Processing ${propertyNumber} (atbb_status: ${atbbStatus})...`);
      
      // 3. storage_locationを取得（Google Drive）
      let storageLocation = await this.propertyImageService.getImageFolderUrl(propertyNumber);
      
      // 4. 業務依頼シートからスプシURLを取得（補助情報）
      let spreadsheetUrl = await this.getSpreadsheetUrlFromGyomuList(propertyNumber);
      
      // 5. property_listingsテーブルに同期
      const propertyData = {
        property_number: propertyNumber,
        property_address: row['物件所在'] || row['住所'] || '',
        atbb_status: atbbStatus,
        storage_location: storageLocation,
        spreadsheet_url: spreadsheetUrl,
        updated_at: new Date().toISOString(),
      };
      
      // 既存の物件を確認して、更新または新規追加
      // ...
    }
  }
}
```

### コメントデータの同期

**重要**: コメントデータの同期については、専用のドキュメントを参照してください：

📄 **[物件コメントデータ自動同期ルール](property-comments-auto-sync-rule.md)**

**概要**:
- `PropertyListingSyncService`は`property_listings`テーブル（基本情報）のみを同期
- コメントデータ（`property_details`テーブル）は**Phase 4.7の自動同期**で処理される
- 5分ごとに自動実行され、`work_tasks`に`spreadsheet_url`がある物件のみを対象とする

**新規物件追加時のチェックリスト**:
- [ ] `PropertyListingSyncService`で`property_listings`テーブルを同期（15分ごとに自動実行）
- [ ] `work_tasks`テーブルに`spreadsheet_url`が登録されているか確認
- [ ] 5分以内に自動同期が実行されるのを待つ（Phase 4.7）

詳細は **[property-comments-auto-sync-rule.md](property-comments-auto-sync-rule.md)** を参照してください。

---

## 📊 同期対象の判定ロジック（公開物件サイト表示用）

### 公開中の物件の定義（公開物件サイト表示用）

⚠️ **注意**: これは**公開物件サイトで表示する物件**の定義です。
**同期対象**とは異なります（同期は基本的に全ての物件）。

`atbb_status`に以下のいずれかが含まれる物件：

1. ✅ `atbb_status`に「**公開中**」が含まれる
   - 例: `専任・公開中`
   - 例: `一般・公開中`
   - 例: `公開中`

2. ✅ `atbb_status`に「**公開前**」が含まれる
   - 例: `公開前`
   - 例: `専任・公開前`

3. ✅ `atbb_status`に「**非公開（配信メールのみ）**」が含まれる
   - 例: `非公開（配信メールのみ）`

### 公開中ではない物件（公開物件サイトで非表示）

⚠️ **注意**: これらの物件も**データベースには同期されます**が、公開物件サイトでは表示されません。

以下は**公開中ではない**ため、公開物件サイトで非表示：

- `非公開案件` ← **公開物件サイトで非表示**
- `成約済み` ← **公開物件サイトで非表示**
- `null` ← **公開物件サイトで非表示**
- その他の値 ← **公開物件サイトで非表示**

---

## 🔍 チェックリスト

公開物件同期のコードを書く前に、以下を確認してください：

### 基本情報同期（`PropertyListingSyncService`）

- [ ] 物件リストスプレッドシート（`PROPERTY_LISTING_SPREADSHEET_ID`）からデータを取得しているか？
- [ ] **正しいカラム名`atbb成約済み/非公開`を使用しているか？**（最重要）
- [ ] **`atbb成約済み/非公開`を最優先にしているか？**
- [ ] **基本的に全ての物件を同期しているか？**（公開中のみという制限は過去の一時的な措置）
- [ ] 業務依頼シートから「スプシURL」を補完しているか？
- [ ] `property_listings`テーブルに同期しているか？
- [ ] 売主データ（`sellers`テーブル）を同期していないか？

### コメントデータ同期（`AthomeSheetSyncService`）

- [ ] **新規物件のコメントデータを同期したか？**（最重要）
- [ ] コメントデータは個別物件スプレッドシートの`athome`シートから取得しているか？
- [ ] 物件タイプに応じて正しいセル位置を使用しているか？
- [ ] パノラマURLは`athome`シートの`N1`セルから取得しているか？
- [ ] `property_details`テーブルに保存しているか？

---

## 🎯 実例：CC105の同期

### 問題1: CC105が物件リストに表示されない

CC105はスプレッドシート（業務依頼シート）には存在するが、ブラウザの物件リストには表示されない（同期できていない）

**原因**:
1. **間違った同期フロー**: 売主データ（`sellers`テーブル）を同期していた ❌
2. **正しい同期フロー**: 物件リスト（`property_listings`テーブル）を同期すべき ✅

**解決策**:
1. **`PropertyListingSyncService`を作成** ✅
   - 物件リストスプレッドシートから物件データを取得
   - 業務依頼シートから「スプシURL」を補完
   - `property_listings`テーブルに同期

2. **Cronエンドポイントを修正** ✅
   - `/api/cron/sync-sellers` → `/api/cron/sync-property-listings`
   - 売主データの同期を停止
   - 物件データの同期を開始

3. **15分後にCC105が同期される** ✅

---

### 問題2: CC105のおすすめコメントが表示されない

CC105は物件一覧に表示されるが、詳細画面でおすすめコメント、お気に入り文言、パノラマURLが表示されない

**原因**:
1. **`PropertyListingSyncService`は`property_listings`テーブルのみを同期**
   - 基本情報（物件番号、住所、価格など）のみ
   - コメントデータは同期しない

2. **コメントデータは別途`AthomeSheetSyncService`で同期が必要**
   - 個別物件スプレッドシートの`athome`シートから取得
   - `property_details`テーブルに保存
   - CC105については実行されていなかった

**解決策**:
1. **`sync-cc105-comments.ts`スクリプトを作成** ✅
   - 業務依頼シートから個別物件スプレッドシートのIDを取得
   - 物件タイプに応じてセル位置を決定
   - `athome`シートからコメントデータを取得（9件のおすすめコメント）
   - `property_details`テーブルに保存

2. **スクリプトを実行** ✅
   ```bash
   npx ts-node backend/sync-cc105-comments.ts
   ```

3. **CC105のおすすめコメントが表示される** ✅

**教訓**: 新規物件を追加する際は、必ず以下の2つの同期を実行すること
1. `PropertyListingSyncService`で基本情報を同期
2. `AthomeSheetSyncService`でコメントデータを同期

---

## 📝 環境変数

以下の環境変数が必要です：

### 物件リストスプレッドシート（メインソース）

```bash
PROPERTY_LISTING_SPREADSHEET_ID=<物件リストスプレッドシートのID>
PROPERTY_LISTING_SHEET_NAME=物件
```

### 業務依頼シート（補助情報）

```bash
GYOMU_LIST_SPREADSHEET_ID=<業務依頼シートのID>
GYOMU_LIST_SHEET_NAME=業務依頼
```

### Google認証

```bash
GOOGLE_SERVICE_ACCOUNT_JSON=<サービスアカウントのJSON>
# または
GOOGLE_SERVICE_ACCOUNT_KEY_PATH=./google-service-account.json
```

### Supabase

```bash
SUPABASE_URL=<SupabaseのURL>
SUPABASE_SERVICE_KEY=<Supabaseのサービスキー>
```

---

## 🚀 デプロイ手順

### ステップ1: コードを修正

```bash
# PropertyListingSyncService.tsを修正
# backend/api/index.tsのcronエンドポイントを修正
# vercel.jsonのcron設定を修正
```

### ステップ2: 変更をコミット

```bash
git add .
git commit -m "Fix: Sync property_listings from 物件スプシ instead of sellers"
git push origin main
```

### ステップ3: Vercelにデプロイ

- 自動的にデプロイされる
- Vercel Dashboardでデプロイ状況を確認

### ステップ4: 15分後に確認

- Vercel Dashboardでログを確認
- CC105が`property_listings`テーブルに追加されることを確認

---

## 💡 トラブルシューティング

### 問題1: CC105が同期されない

**確認事項**:
1. 物件リストスプレッドシートにCC105が存在するか？
2. ~~`atbb_status`に「公開中」「公開前」「非公開（配信メールのみ）」のいずれかが含まれるか？~~ ← **不要**（全ての物件を同期）
3. Cronジョブが正しく実行されているか？（Vercel Dashboardで確認）
4. 個別物件スプレッドシートのIDが業務依頼シートに登録されているか？

### 問題2: 売主データが同期されてしまう

**原因**: 間違ったCronエンドポイント（`/api/cron/sync-sellers`）を使用している

**解決策**: 
1. `vercel.json`を確認
2. `/api/cron/sync-property-listings`を使用しているか確認
3. 修正してデプロイ

### 問題3: 公開中の物件が「成約済み」バッジになる

**原因**: 間違った`atbb_status`カラム名を使用している

**確認事項**:
1. `PropertyListingSyncService.ts`で正しいカラム名`atbb成約済み/非公開`を使用しているか？
2. `atbb成約済み/非公開`を最優先にしているか？
3. データベースの`atbb_status`が空文字列になっていないか？

**解決策**:
```typescript
// ✅ 正しいコード
const atbbStatus = String(
  row['atbb成約済み/非公開'] ||  // ← 正しいカラム名（最優先）
  row['atbb_status'] ||          // ← フォールバック
  ''
);
```

**確認方法**:
```bash
# ヘッダー確認
npx ts-node backend/check-property-list-headers.ts

# 特定物件の確認
npx ts-node backend/check-aa12398-atbb-status.ts
```

### 問題4: コメントデータが表示されない

**症状**: 物件一覧には表示されるが、詳細画面でおすすめコメント、お気に入り文言、パノラマURLが表示されない

**原因**: `property_details`テーブルにコメントデータが同期されていない

**解決策**: 📄 **[物件コメントデータ自動同期ルール](property-comments-auto-sync-rule.md)** を参照してください

**概要**:
- Phase 4.7の自動同期が5分ごとに実行される
- `work_tasks`に`spreadsheet_url`が登録されているか確認
- 緊急時は手動同期スクリプトを実行

### 問題5: 環境変数が設定されていない

**確認方法**:
```bash
# Vercel Dashboardで環境変数を確認
# Settings → Environment Variables
```

**必要な環境変数**:
- `PROPERTY_LISTING_SPREADSHEET_ID`
- `GYOMU_LIST_SPREADSHEET_ID`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`

---

## まとめ

**正しい同期フロー**:
1. ✅ 物件スプシ（物件リストスプレッドシート）に新規列が追加される
2. ✅ その物件スプシから`property_listings`テーブルを同期（**基本的に全ての物件**）
3. ✅ 業務依頼シートから「スプシURL」を取得して補完
4. ✅ **コメントデータは自動同期（Phase 4.7）で処理される** - 詳細は 📄 **[property-comments-auto-sync-rule.md](property-comments-auto-sync-rule.md)** を参照

**絶対にやってはいけないこと**:
- ❌ 売主データ（`sellers`テーブル）を同期する
- ❌ 業務依頼シートをメインソースにする
- ❌ 新規案件を`atbb_status`でフィルタリングする（全て同期すべき）
- ❌ 間違った`atbb_status`カラム名（`atbb_status`, `ATBB_status`, `ステータス`）を使用する

**正しいカラム名**:
- ✅ **`atbb成約済み/非公開`** ← これが唯一の正しいカラム名
- ✅ **`所在地`** ← 物件の住所（`物件所在`ではない）
- ✅ **`住居表示（ATBB登録住所）`** ← 住居表示

**新規物件追加時の必須チェックリスト**:
1. ✅ `PropertyListingSyncService`で`property_listings`テーブルを同期（15分ごとに自動実行）
2. ✅ `work_tasks`テーブルに`spreadsheet_url`が登録されているか確認
3. ✅ 5分以内に自動同期（Phase 4.7）が実行されるのを待つ

**この順番が重要です！絶対に間違えないでください。**

---

**最終更新日**: 2026年2月3日  
**作成理由**: 公開物件の同期フローを明確化し、同じ間違いを繰り返さないため  
**更新履歴**:
- 2026年2月3日: コメントデータ同期の重複内容を削除、専用ドキュメントへの参照に変更
