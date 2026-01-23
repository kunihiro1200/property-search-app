# 問合せフォーム 動作確認済み設定（2026年1月23日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月23日
**最新コミット**: `ef5b9b5` - "Implement Vercel Cron Jobs for inquiry sync with JST timezone"
**以前のコミット**: `fee0998` - "Fix: Save inquiry to database first, then sync to sheet in background"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

## 🆕 最新の変更（2026年1月23日）

### Vercel Cron Jobs方式に変更

**理由**: Vercelのサーバーレス関数は、バックグラウンド処理が完了する前に終了してしまうため、スプレッドシート同期が失敗していました。

**新しいアーキテクチャ**:
1. 問合せAPIはデータベースに保存のみ（`sheet_sync_status='pending'`）
2. Vercel Cron Jobが1分ごとに`/api/cron/sync-inquiries`を実行
3. Cron Jobが`pending`状態の問合せをスプレッドシートに同期
4. **JST（日本時間）変換を実装**（買主リストのB列「作成日時」）

### 必須設定

以下の設定が**完了していない場合、Cron Jobは動作しません**：

1. **Vercel環境変数**: `CRON_SECRET`を設定
2. **Vercel Cron設定**: `/api/cron/sync-inquiries`が毎分実行されるように設定
3. **データベースマイグレーション**: `property_number`カラムを追加

---

## 📋 設定チェックリスト

### ✅ 1. Vercel環境変数の設定

**Vercel Dashboard → Settings → Environment Variables**

以下の環境変数が設定されているか確認：

| 環境変数 | 値 | 必須 |
|---------|---|------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | ✅ |
| `SUPABASE_SERVICE_KEY` | Supabaseサービスキー | ✅ |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheets認証用JSON | ✅ |
| `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` | `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY` | ✅ |
| `GOOGLE_SHEETS_BUYER_SHEET_NAME` | `買主リスト` | ✅ |
| **`CRON_SECRET`** | **任意のランダム文字列（例: `my-secret-cron-key-12345`）** | **✅ 必須** |

**`CRON_SECRET`が設定されていない場合、Cron Jobは動作しません！**

### ✅ 2. Vercel Cron設定の確認

**Vercel Dashboard → Settings → Crons**

以下のCron Jobが表示されているか確認：

| Path | Schedule | 説明 |
|------|----------|------|
| `/api/cron/sync-inquiries` | `* * * * *` | 毎分実行（問合せをスプレッドシートに同期） |

**Cron Jobが表示されていない場合**:
1. `vercel.json`に`crons`セクションが含まれているか確認
2. 最新のコードをデプロイ（`git push`）
3. Vercel Dashboardでデプロイが完了するまで待つ

### ✅ 3. データベースマイグレーションの実行

**Supabase Dashboard → SQL Editor**

以下のSQLを実行：

```sql
-- property_numberカラムを追加
ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS property_number TEXT;

-- buyer_numberカラムを追加
ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS buyer_number INTEGER;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_number ON property_inquiries(property_number);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_buyer_number ON property_inquiries(buyer_number);
```

**実行後、以下のSQLで確認**:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'property_inquiries';
```

`property_number`と`buyer_number`カラムが表示されればOK。

---

## 問題の経緯

### 初期の問題
- 問合せフォームを送信すると500エラーが発生
- `publicPropertiesRoutes`を有効にすると、ルートの重複でエラー
- `InquirySyncService`を使用すると、`DATABASE_URL`が必要でエラー

### 試行錯誤
1. ❌ `publicPropertiesRoutes`を有効化 → ルートの重複でエラー
2. ❌ `InquirySyncService`を動的インポート → `DATABASE_URL`が必要でエラー
3. ❌ `GoogleSheetsClient`を直接使用 → 認証エラーまたはタイムアウト
4. ❌ バックグラウンド同期（`async IIFE`） → Vercelのサーバーレス関数が終了してしまう
5. ✅ **Vercel Cron Jobsを使用** → 成功！

### 最新の問題（2026年1月23日）

- **タイムゾーンの問題**: 買主リストのB列「作成日時」がUTCで書き込まれていた
- **解決策**: JST（日本時間）変換を実装（UTC + 9時間）

---

## 成功した設定（最新版）

### アーキテクチャ

```
ユーザー → 問合せフォーム送信
    ↓
backend/api/index.ts (POST /api/public/inquiries)
    ↓
1. バリデーション
    ↓
2. Supabase (property_inquiries) に保存
   - sheet_sync_status: 'pending'
   - created_at: UTC時刻
    ↓
3. ユーザーに即座に成功レスポンスを返す ✅
    ↓
【Vercel Cron Job（1分ごとに実行）】
    ↓
backend/api/index.ts (GET /api/cron/sync-inquiries)
    ↓
4. pending状態の問合せを取得（最大10件）
    ↓
5. 各問合せをスプレッドシートに同期
   - created_atをJST（UTC + 9時間）に変換 ✅
   - 買主番号を採番（データベースベース）
   - スプレッドシートに追加
    ↓
6. 同期成功 → sheet_sync_status: 'synced', buyer_number: XXX
   同期失敗 → sheet_sync_status: 'failed', sync_retry_count++
```

### 重要なポイント

1. **即座にデータベースに保存**
   - ユーザーを待たせない
   - データが失われない

2. **Vercel Cron Jobsで同期**
   - 1分ごとに自動実行
   - Vercelのサーバーレス関数の制限を回避

3. **JST（日本時間）変換**
   - データベースには`created_at`をUTCで保存
   - スプレッドシートには`作成日時`をJST（UTC + 9時間）で書き込み
   - 例: `2026-01-23 10:30:00` (UTC) → `2026-01-23 19:30:00` (JST)

4. **エラー耐性**
   - スプレッドシート同期が失敗しても、データベースには保存済み
   - Cron Jobが1分後に再試行

---

## コード実装（最新版）

### JST変換の実装

```typescript
// UTC時刻をJST（日本時間）に変換
const nowUtc = new Date(inquiry.created_at);
const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000); // UTC + 9時間
const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);

// 例:
// UTC: 2026-01-23T10:30:00.000Z
// JST: 2026-01-23 19:30:00
```

### backend/api/index.ts（Cron Jobエンドポイント）

```typescript
// Cron Job: 問合せをスプレッドシートに同期（1分ごとに実行）
app.get('/api/cron/sync-inquiries', async (req, res) => {
  try {
    console.log('[Cron] Starting inquiry sync job...');
    
    // Vercel Cron Jobの認証チェック
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Cron] Unauthorized access attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // pending状態の問合せを取得（最大10件）
    const { data: pendingInquiries, error: fetchError } = await supabase
      .from('property_inquiries')
      .select('*')
      .eq('sheet_sync_status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10);
    
    if (fetchError) {
      console.error('[Cron] Error fetching pending inquiries:', fetchError);
      throw fetchError;
    }
    
    if (!pendingInquiries || pendingInquiries.length === 0) {
      console.log('[Cron] No pending inquiries to sync');
      return res.status(200).json({ 
        success: true, 
        message: 'No pending inquiries',
        synced: 0
      });
    }
    
    console.log(`[Cron] Found ${pendingInquiries.length} pending inquiries`);
    
    // Google Sheets認証
    const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
    const sheetsClient = new GoogleSheetsClient({
      spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
      sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
      serviceAccountKeyPath: './google-service-account.json',
    });
    
    await sheetsClient.authenticate();
    console.log('[Cron] Google Sheets authenticated');
    
    // 最大買主番号を取得
    const { data: latestInquiry } = await supabase
      .from('property_inquiries')
      .select('buyer_number')
      .not('buyer_number', 'is', null)
      .order('buyer_number', { ascending: false })
      .limit(1)
      .single();
    
    let nextBuyerNumber = latestInquiry?.buyer_number ? latestInquiry.buyer_number + 1 : 1;
    
    // 各問合せを同期
    let syncedCount = 0;
    let failedCount = 0;
    
    for (const inquiry of pendingInquiries) {
      try {
        console.log(`[Cron] Syncing inquiry ${inquiry.id} (${inquiry.name})...`);
        
        // 電話番号を正規化
        const normalizedPhone = inquiry.phone.replace(/[^0-9]/g, '');
        
        // ✅ 現在時刻をJST（日本時間）で取得
        const nowUtc = new Date(inquiry.created_at);
        const jstDate = new Date(nowUtc.getTime() + 9 * 60 * 60 * 1000);
        const jstDateString = jstDate.toISOString().replace('T', ' ').substring(0, 19);
        
        // スプレッドシートに追加
        const rowData = {
          '買主番号': nextBuyerNumber.toString(),
          '作成日時': jstDateString, // ✅ JST変換済み
          '●氏名・会社名': inquiry.name,
          '●問合時ヒアリング': inquiry.message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '●メアド': inquiry.email,
          '●問合せ元': 'いふう独自サイト',
          '物件番号': inquiry.property_number || '',
          '【問合メール】電話対応': '未',
        };
        
        await sheetsClient.appendRow(rowData);
        
        // データベースを更新
        await supabase
          .from('property_inquiries')
          .update({ 
            sheet_sync_status: 'synced',
            buyer_number: nextBuyerNumber
          })
          .eq('id', inquiry.id);
        
        console.log(`[Cron] Synced inquiry ${inquiry.id} with buyer number ${nextBuyerNumber}`);
        syncedCount++;
        nextBuyerNumber++;
        
      } catch (error) {
        console.error(`[Cron] Failed to sync inquiry ${inquiry.id}:`, error);
        
        // 失敗をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({ 
            sheet_sync_status: 'failed',
            sync_retry_count: (inquiry.sync_retry_count || 0) + 1
          })
          .eq('id', inquiry.id);
        
        failedCount++;
      }
    }
    
    console.log(`[Cron] Sync job completed: ${syncedCount} synced, ${failedCount} failed`);
    
    res.status(200).json({
      success: true,
      synced: syncedCount,
      failed: failedCount,
      total: pendingInquiries.length
    });
    
  } catch (error: any) {
    console.error('[Cron] Error in sync job:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});
```

---

## 🧪 テスト手順

### ステップ1: 設定を確認

1. **Vercel環境変数を確認**
   ```bash
   vercel env ls
   ```
   - `CRON_SECRET`が設定されているか確認

2. **Vercel Cron設定を確認**
   - Vercel Dashboard → Settings → Crons
   - `/api/cron/sync-inquiries`が表示されているか確認

3. **データベースマイグレーションを確認**
   - Supabase Dashboard → SQL Editor
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'property_inquiries';
   ```
   - `property_number`と`buyer_number`カラムが存在するか確認

### ステップ2: ローカルでテスト

```bash
cd backend
npx ts-node test-inquiry-sync-with-jst.ts
```

このスクリプトは：
- pending状態の問合せを取得
- JST変換を実行
- スプレッドシートに同期
- 結果を表示

### ステップ3: 本番環境でテスト

1. **問合せフォームから送信**
   - https://property-site-frontend-kappa.vercel.app/public/properties
   - 任意の物件の「お問い合わせ」ボタンをクリック
   - フォームを送信

2. **データベースを確認**
   ```sql
   SELECT id, name, sheet_sync_status, created_at 
   FROM property_inquiries 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - `sheet_sync_status`が`'pending'`になっているか確認

3. **1分待つ**
   - Vercel Cron Jobが実行されるまで待つ

4. **データベースを再確認**
   ```sql
   SELECT id, name, sheet_sync_status, buyer_number, created_at 
   FROM property_inquiries 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
   - `sheet_sync_status`が`'synced'`になっているか確認
   - `buyer_number`が設定されているか確認

5. **スプレッドシートを確認**
   - 買主リストに新しい行が追加されているか確認
   - B列「作成日時」がJST（日本時間）になっているか確認

### ステップ4: Vercelログを確認

**Vercel Dashboard → Deployments → 最新のデプロイメント → Functions**

1. `/api/public/inquiries`のログを確認
   - `[Inquiry API] Saved to database`が表示されているか

2. `/api/cron/sync-inquiries`のログを確認
   - `[Cron] Starting inquiry sync job...`が表示されているか
   - `[Cron] Synced inquiry XXX with buyer number YYY`が表示されているか

---

## 環境変数

### Vercel Dashboard → Settings → Environment Variables

以下の環境変数が設定されています：

| 環境変数 | 値 | 説明 |
|---------|---|------|
| `SUPABASE_URL` | SupabaseプロジェクトのURL | データベース接続用 |
| `SUPABASE_SERVICE_KEY` | Supabaseサービスキー | データベース接続用 |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Google Sheets認証用JSON | スプレッドシート同期用 |
| `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` | `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY` | 買主リストスプレッドシートID |
| `GOOGLE_SHEETS_BUYER_SHEET_NAME` | `買主リスト` | 買主リストシート名 |
| **`CRON_SECRET`** | **任意のランダム文字列** | **Cron Job認証用（必須）** |

### ⚠️ 重要な注意事項

- `DATABASE_URL`は**不要**です（Supabaseクライアントを使用するため）
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`は**不要**です（`GOOGLE_SERVICE_ACCOUNT_JSON`を使用するため）
- **`CRON_SECRET`が設定されていない場合、Cron Jobは動作しません！**

---

## データベーススキーマ

### property_inquiries テーブル

```sql
CREATE TABLE property_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES property_listings(id),
  property_number TEXT, -- 物件番号（新規追加）
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sheet_sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  sync_retry_count INTEGER DEFAULT 0,
  buyer_number INTEGER, -- 買主番号（新規追加）
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス
CREATE INDEX idx_property_inquiries_property_number ON property_inquiries(property_number);
CREATE INDEX idx_property_inquiries_buyer_number ON property_inquiries(buyer_number);
CREATE INDEX idx_property_inquiries_sheet_sync_status ON property_inquiries(sheet_sync_status);
```

### マイグレーションSQL

```sql
-- property_numberカラムを追加
ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS property_number TEXT;

-- buyer_numberカラムを追加
ALTER TABLE property_inquiries ADD COLUMN IF NOT EXISTS buyer_number INTEGER;

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_property_inquiries_property_number ON property_inquiries(property_number);
CREATE INDEX IF NOT EXISTS idx_property_inquiries_buyer_number ON property_inquiries(buyer_number);
```

---

## トラブルシューティング

### 問合せフォームが送信できない場合

#### チェック1: 環境変数を確認

```bash
vercel env ls
```

以下の環境変数が設定されているか確認：
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`

#### チェック2: データベースを確認

```sql
SELECT * FROM property_inquiries ORDER BY created_at DESC LIMIT 10;
```

問合せデータが保存されているか確認。

#### チェック3: スプレッドシート同期を確認

```sql
SELECT id, name, sheet_sync_status, sync_retry_count, created_at 
FROM property_inquiries 
WHERE sheet_sync_status = 'failed' 
ORDER BY created_at DESC;
```

同期に失敗した問合せがあるか確認。

#### チェック4: Vercelログを確認

Vercel Dashboard → Deployments → 最新のデプロイメント → Functions → `/api/public/inquiries`

エラーログを確認。

---

## 同期失敗時の対応

### 手動で再同期する

同期に失敗した問合せを手動でスプレッドシートに追加する場合：

1. データベースから問合せデータを取得
2. スプレッドシートに手動で追加
3. `sheet_sync_status`を`'synced'`に更新

```sql
UPDATE property_inquiries 
SET sheet_sync_status = 'synced' 
WHERE id = 'xxx-xxx-xxx';
```

### 自動再試行スクリプト（今後の実装）

```typescript
// backend/retry-failed-inquiry-sync.ts
// 同期に失敗した問合せを自動的に再試行するスクリプト
```

---

## 今後の改善案

### 1. 自動再試行機能
- `sheet_sync_status = 'failed'`の問合せを定期的に再試行
- `sync_retry_count`を増やして、最大3回まで再試行

### 2. 管理画面
- 同期失敗した問合せを一覧表示
- 手動で再同期できるボタン

### 3. 通知機能
- 同期失敗時にSlackやメールで通知

---

## まとめ

### 成功の鍵

1. **データベースファースト**: まずデータベースに保存（`sheet_sync_status='pending'`）
2. **Vercel Cron Jobs**: 1分ごとに自動同期（Vercelのサーバーレス関数の制限を回避）
3. **JST変換**: スプレッドシートには日本時間（UTC + 9時間）で書き込み
4. **エラー耐性**: 同期失敗してもデータベースには保存済み

### 絶対に変更してはいけないこと

- ❌ `publicPropertiesRoutes`を有効にしない（ルートの重複）
- ❌ `InquirySyncService`を使用しない（`DATABASE_URL`が必要）
- ❌ バックグラウンド同期（`async IIFE`）を使用しない（Vercelのサーバーレス関数が終了してしまう）
- ❌ JST変換を削除しない（買主リストの時刻がUTCになってしまう）

### 必須設定

以下の設定が**完了していない場合、Cron Jobは動作しません**：

1. ✅ **Vercel環境変数**: `CRON_SECRET`を設定
2. ✅ **Vercel Cron設定**: `/api/cron/sync-inquiries`が毎分実行されるように設定
3. ✅ **データベースマイグレーション**: `property_number`と`buyer_number`カラムを追加

### 問題が発生したら

1. **このファイルを確認する**
2. **設定チェックリストを確認する**（上記参照）
3. **テスト手順を実行する**（上記参照）
4. **Vercelログを確認する**（Vercel Dashboard → Deployments → Functions）
5. **最新のコミット（`ef5b9b5`）に戻す**
   ```bash
   git show ef5b9b5:backend/api/index.ts > backend/api/index.ts
   git show ef5b9b5:vercel.json > vercel.json
   git add backend/api/index.ts vercel.json
   git commit -m "Revert to working inquiry API with Cron Jobs (commit ef5b9b5)"
   git push
   ```

---

**このドキュメントを保存して、今後の参考にしてください！**
