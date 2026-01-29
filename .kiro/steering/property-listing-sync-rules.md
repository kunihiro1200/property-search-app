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
- `atbb_status` - 公開ステータス（「公開中」「公開前」「非公開（配信メールのみ）」のいずれかを含む）
- `物件所在` または `住所` - 物件の住所

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
      const atbbStatus = row['atbb_status'] || row['ATBB_status'] || row['ステータス'] || '';
      
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

```typescript
// ✅ コメントデータの同期（AthomeSheetSyncService）
export class AthomeSheetSyncService {
  async syncPropertyComments(
    propertyNumber: string,
    propertyType: 'land' | 'detached_house' | 'apartment'
  ): Promise<boolean> {
    // 1. 個別物件スプレッドシートのIDを取得（業務依頼シートから）
    const spreadsheetId = await this.getIndividualSpreadsheetId(propertyNumber);
    
    // 2. athomeシートからコメントデータを取得
    const comments = await this.fetchCommentsFromAthomeSheet(spreadsheetId, propertyType);
    
    // 3. パノラマURLを取得（athomeシートのN1セル）
    const panoramaResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'athome!N1',
    });
    const panoramaUrl = panoramaResponse.data.values?.[0]?.[0] || null;
    
    // 4. データベースに保存
    await this.propertyDetailsService.upsertPropertyDetails(propertyNumber, {
      favorite_comment: comments.favoriteComment,
      recommended_comments: comments.recommendedComments,
      athome_data: panoramaUrl ? [panoramaUrl] : [],
    });
  }
}
```

---

## 📊 コメントデータとパノラマURLの取得元

### コメントデータの取得フロー

**ソース**: 個別物件スプレッドシートの`athome`シート
**取得方法**: `AthomeSheetSyncService`を使用

### 1. **お気に入り文言（favorite_comment）**

**物件種別ごとのセル位置**:

| 物件種別 | セル位置 | 説明 |
|---------|---------|------|
| 土地（land） | `B53` | athomeシートのB53セル |
| 戸建て（detached_house） | `B142` | athomeシートのB142セル |
| マンション（apartment） | `B150` | athomeシートのB150セル |

**取得例**:
```typescript
// 土地の場合
const favoriteResponse = await sheets.spreadsheets.values.get({
  spreadsheetId: '<個別物件スプレッドシートID>',
  range: 'athome!B53',
});
const favoriteComment = favoriteResponse.data.values?.[0]?.[0] || null;
```

### 2. **アピールポイント（recommended_comments）**

**物件種別ごとのセル範囲**:

| 物件種別 | セル範囲 | 説明 |
|---------|---------|------|
| 土地（land） | `B63:L79` | athomeシートのB63からL79まで |
| 戸建て（detached_house） | `B152:L166` | athomeシートのB152からL166まで |
| マンション（apartment） | `B149:L163` | athomeシートのB149からL163まで |

**取得例**:
```typescript
// 土地の場合
const recommendedResponse = await sheets.spreadsheets.values.get({
  spreadsheetId: '<個別物件スプレッドシートID>',
  range: 'athome!B63:L79',
});
const recommendedRows = recommendedResponse.data.values || [];
const recommendedComments: string[] = [];

recommendedRows.forEach(row => {
  const text = row.join(' ').trim();
  if (text) {
    recommendedComments.push(text);
  }
});
```

### 3. **パノラマURL（panorama_url）**

**取得方法**: 固定セル位置から取得

**セル位置**: `athome`シートの`N1`セル（全ての物件種別で共通）

**取得例**:
```typescript
// athomeシートのN1セルからパノラマURLを取得
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: '<個別物件スプレッドシートID>',
  range: 'athome!N1',
});

const panoramaUrl = response.data.values?.[0]?.[0] || null;
```

### 4. **個別物件スプレッドシートIDの取得**

**ソース**: 業務依頼シート（`GYOMU_LIST_SPREADSHEET_ID`）
**シート名**: `業務依頼`
**検索範囲**: `A:D`（A列: 物件番号、D列: スプシURL）

**取得フロー**:
1. 業務依頼シートのA列で物件番号を検索
2. 見つかった行のD列（スプシURL）を取得
3. URLからスプレッドシートIDを抽出（正規表現: `/\/d\/([a-zA-Z0-9-_]+)/`）

**取得例**:
```typescript
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: process.env.GYOMU_LIST_SPREADSHEET_ID,
  range: '業務依頼!A:D',
});

const rows = response.data.values || [];

for (const row of rows) {
  if (row[0] === propertyNumber) { // A列: 物件番号
    const spreadsheetUrl = row[3]; // D列: スプシURL
    if (spreadsheetUrl) {
      const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (match) {
        return match[1]; // スプレッドシートID
      }
    }
  }
}
```

### 5. **データベースへの保存**

**テーブル**: `property_details`
**保存内容**:

| カラム | 内容 | 例 |
|-------|------|-----|
| `property_number` | 物件番号 | `AA12345` |
| `favorite_comment` | お気に入り文言 | `駅近で便利な立地！` |
| `recommended_comments` | アピールポイント（配列） | `["南向きで日当たり良好", "閑静な住宅街"]` |
| `athome_data` | パノラマURL（配列） | `["https://vrpanorama.athome.jp/..."]` |

**保存例**:
```typescript
await propertyDetailsService.upsertPropertyDetails(propertyNumber, {
  favorite_comment: comments.favoriteComment,
  recommended_comments: comments.recommendedComments,
  athome_data: comments.panoramaUrl ? [comments.panoramaUrl] : [],
});
```

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

- [ ] 物件リストスプレッドシート（`PROPERTY_LISTING_SPREADSHEET_ID`）からデータを取得しているか？
- [ ] **基本的に全ての物件を同期しているか？**（公開中のみという制限は過去の一時的な措置）
- [ ] 業務依頼シートから「スプシURL」を補完しているか？
- [ ] `property_listings`テーブルに同期しているか？
- [ ] 売主データ（`sellers`テーブル）を同期していないか？
- [ ] コメントデータは個別物件スプレッドシートの`athome`シートから取得しているか？
- [ ] パノラマURLは動的検索で取得しているか？

---

## 🎯 実例：CC105の同期

### 問題

CC105はスプレッドシート（業務依頼シート）には存在するが、ブラウザの物件リストには表示されない（同期できていない）

### 原因

1. **間違った同期フロー**: 売主データ（`sellers`テーブル）を同期していた ❌
2. **正しい同期フロー**: 物件リスト（`property_listings`テーブル）を同期すべき ✅

### 解決策

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

### 問題4: コメントデータが表示されない

**確認事項**:
1. 個別物件スプレッドシートに`athome`シートが存在するか？
2. `athome`シートの正しいセル位置にデータが入力されているか？
   - 土地: お気に入り文言（B53）、アピールポイント（B63:L79）
   - 戸建て: お気に入り文言（B142）、アピールポイント（B152:L166）
   - マンション: お気に入り文言（B150）、アピールポイント（B149:L163）
3. `AthomeSheetSyncService`が正しく実行されているか？

### 問題5: パノラマURLが表示されない

**確認事項**:
1. `athome`シートの`N1`セルにパノラマURLが入力されているか？
2. URLが正しい形式（`http`または`https`で始まる）か？
3. `AthomeSheetSyncService`が正しく実行されているか？

### 問題3: 環境変数が設定されていない

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
4. ✅ 個別物件スプレッドシートの`athome`シートからコメントデータを取得
5. ✅ パノラマURLを動的検索で取得

**絶対にやってはいけないこと**:
- ❌ 売主データ（`sellers`テーブル）を同期する
- ❌ 業務依頼シートをメインソースにする
- ❌ 新規案件を`atbb_status`でフィルタリングする（全て同期すべき）

**コメントデータの取得元**:
- **お気に入り文言**: 個別物件スプレッドシートの`athome`シート（物件種別ごとに異なるセル位置）
- **アピールポイント**: 個別物件スプレッドシートの`athome`シート（物件種別ごとに異なるセル範囲）
- **パノラマURL**: 個別物件スプレッドシートの`athome`シートの`N1`セル（全ての物件種別で共通）

**この順番が重要です！絶対に間違えないでください。**

---

**最終更新日**: 2026年1月29日  
**作成理由**: 公開物件の同期フローを明確化し、同じ間違いを繰り返さないため
