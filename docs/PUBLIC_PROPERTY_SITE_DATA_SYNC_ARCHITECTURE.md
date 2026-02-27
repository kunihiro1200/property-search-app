# 公開物件サイト データ同期アーキテクチャ

## 概要

公開物件サイト（`backend/api/` + `frontend/`）のデータ管理方式についての設計メモです。

---

## アーキテクチャの基本方針

### なぜ静的データ方式を採用しているか

Google Sheets APIはリクエストごとにデータを取得する方式だと、以下の問題が発生します：

- データ量が多い場合、レスポンスが遅くなる
- Google Sheets APIのクォータ制限に引っかかる
- ユーザーのリクエストのたびにAPIを叩くのは現実的でない

そのため、このシステムでは以下の方針を採用しています：

- アプリが読み込むデータはSupabaseに保存された**静的なスナップショット**
- Sheets APIへの直接リクエストはアプリのリクエスト時には行わない
- バックグラウンドの**定期同期**でSupabaseのデータを最新に保つ

---

## データの流れ

```
Google スプレッドシート
        ↓（定期同期）
   Supabase DB
        ↓（クエリ）
   公開物件サイト（ユーザー）
```

---

## 現在の実装

### データ保存先

**Supabase** の以下のテーブル：

| テーブル | 用途 |
|---------|------|
| `property_listings` | 物件一覧データ |
| `property_details` | 物件詳細・コメントデータ |

### 定期同期の仕組み

**設定ファイル**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron-sync",
      "schedule": "*/10 * * * *"
    }
  ]
}
```

- Vercel Cronが**10分ごと**に `/api/cron-sync` を実行
- `backend/api/cron-sync.ts` が `EnhancedAutoSyncService` を呼び出す
- スプレッドシートのデータをSupabaseに同期

### 同期フロー

```
Vercel Cron（10分ごと）
        ↓
backend/api/cron-sync.ts
        ↓
EnhancedAutoSyncService.runFullSync()
        ↓
スプレッドシート → Supabase DB
```

---

## GASによる定期同期への移行可能性

### 技術的には可能

GAS（Google Apps Script）のトリガー機能を使って、同じ定期同期を実現できます。

```
GAS トリガー（時間ベース）
        ↓
Supabase REST API
        ↓
Supabase DB 更新
```

### 現在の構成との比較

| 項目 | 現在（Vercel Cron） | GAS |
|------|-------------------|-----|
| コスト | Vercelプロプランが必要な場合あり | 無料 |
| 認証 | サービスアカウントキー必要 | スプレッドシートに直接アクセス可能 |
| 実行時間制限 | なし | 6分/回 |
| ロジック | TypeScript（既存コード流用可） | JavaScript（移植が必要） |
| 管理場所 | Vercelプロジェクト内 | Googleスプレッドシート内 |

### GASのメリット

- 無料で使える
- スプレッドシートと同じGoogleアカウントで管理できる
- Sheets APIの認証が不要（スプレッドシートに直接アクセス）

### GASのデメリット

- 実行時間が6分に制限される（大量データの場合は注意）
- 現在のTypeScriptロジックをJavaScriptに移植する必要がある
- エラーハンドリングやログ管理が現在より簡素になる

### GASでコードを書く際の必須ルール

#### Sheets APIを使った一括取得で高速化する

GASでスプレッドシートのデータを取得する際は、**必ずSheets APIの一括取得を使用すること**。

**❌ 禁止：セルを1つずつ取得（低速）**

```javascript
// NG: ループ内でgetValue()を呼ぶと、1セルごとにAPIリクエストが発生する
for (let i = 2; i <= lastRow; i++) {
  const value = sheet.getRange(i, 1).getValue(); // 毎回APIリクエスト → 非常に遅い
}
```

**✅ 必須：getValues()で全データを一括取得（高速）**

```javascript
// OK: 1回のAPIリクエストで全データを取得してからループ処理する
const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues(); // 1回だけAPIリクエスト
for (let i = 0; i < data.length; i++) {
  const value = data[i][0]; // メモリ上のデータにアクセス → 高速
}
```

**理由**：
- GASの実行時間制限は6分/回
- セルを1つずつ取得すると、数百行のデータでも数分かかる場合がある
- `getValues()` で一括取得すれば、数千行でも数秒で処理できる

#### Supabase REST APIへの書き込みも一括で行う

スプレッドシートのデータをSupabaseに書き込む際も、1件ずつではなく**バッチ（一括）でupsertする**こと。

```javascript
// OK: 複数レコードをまとめてupsert
const records = data.map(row => ({
  property_number: row[0],
  name: row[1],
  // ...
}));

// 一括upsert（1回のHTTPリクエスト）
UrlFetchApp.fetch(supabaseUrl + '/rest/v1/property_listings', {
  method: 'post',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + supabaseKey,
    'Prefer': 'resolution=merge-duplicates'
  },
  payload: JSON.stringify(records)
});
```

---

## まとめ

- 公開物件サイトのデータは **Supabase** に保存されている
- アプリはSupabaseからデータを読むだけ（Sheets APIには直接触れない）
- 定期同期（現在はVercel Cron、10分ごと）でSupabaseを最新に保つ
- GASへの移行は技術的に可能だが、ロジックの移植が必要
- GASでコードを書く際は、Sheets APIの一括取得（`getValues()`）とSupabaseへのバッチupsertを使い、処理を高速化すること

---

**作成日**: 2026年2月27日  
**対象**: 公開物件サイト（`backend/api/` + `frontend/`）
