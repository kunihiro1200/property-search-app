# 問合せフォーム 動作確認済み設定（2026年1月23日）

## ⚠️ 重要：この設定は動作確認済みです。絶対に変更しないでください！

**動作確認日時**: 2026年1月23日
**コミット**: `fee0998` - "Fix: Save inquiry to database first, then sync to sheet in background"
**本番URL**: https://property-site-frontend-kappa.vercel.app/public/properties

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
4. ✅ **データベースに保存してからバックグラウンドで同期** → 成功！

---

## 成功した設定

### アーキテクチャ

```
ユーザー → 問合せフォーム送信
    ↓
backend/api/index.ts (POST /api/public/inquiries)
    ↓
1. バリデーション
    ↓
2. Supabase (property_inquiries) に保存
    ↓
3. ユーザーに即座に成功レスポンスを返す ✅
    ↓
4. バックグラウンドでスプレッドシートに同期（非同期）
    ↓
5. 同期成功 → sheet_sync_status: 'synced'
   同期失敗 → sheet_sync_status: 'failed'
```

### 重要なポイント

1. **即座にデータベースに保存**
   - ユーザーを待たせない
   - データが失われない

2. **バックグラウンドで同期**
   - スプレッドシート同期は時間がかかる（5-10秒）
   - 同期エラーがユーザーに影響しない

3. **エラー耐性**
   - スプレッドシート同期が失敗しても、データベースには保存済み
   - 後で再試行できる

---

## コード実装

### backend/api/index.ts

```typescript
// 問い合わせ送信API
app.post('/api/public/inquiries', async (req, res) => {
  try {
    console.log('[Inquiry API] Received inquiry request');
    
    // バリデーション
    const { name, email, phone, message, propertyId } = req.body;
    
    if (!name || !email || !phone || !message) {
      console.error('[Inquiry API] Validation failed: missing required fields');
      return res.status(400).json({
        success: false,
        message: '必須項目を入力してください'
      });
    }
    
    // 物件情報を取得（propertyIdが指定されている場合）
    let propertyNumber = null;
    if (propertyId) {
      console.log('[Inquiry API] Fetching property:', propertyId);
      const property = await propertyListingService.getPublicPropertyById(propertyId);
      if (property) {
        propertyNumber = property.property_number;
        console.log('[Inquiry API] Property found:', propertyNumber);
      }
    }
    
    // Supabaseのproperty_inquiriesテーブルに保存
    console.log('[Inquiry API] Saving to database...');
    const { data: inquiry, error } = await supabase
      .from('property_inquiries')
      .insert({
        property_id: propertyId || null,
        name,
        email,
        phone,
        message,
        sheet_sync_status: 'pending', // スプレッドシート同期待ち
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) {
      console.error('[Inquiry API] Database error:', error);
      throw error;
    }
    
    console.log('[Inquiry API] Saved to database:', inquiry.id);
    
    // バックグラウンドでスプレッドシートに同期（エラーが発生してもユーザーには影響しない）
    (async () => {
      try {
        console.log('[Inquiry API] Starting background sync to sheet...');
        
        const { GoogleSheetsClient } = await import('../src/services/GoogleSheetsClient');
        const sheetsClient = new GoogleSheetsClient({
          spreadsheetId: process.env.GOOGLE_SHEETS_BUYER_SPREADSHEET_ID!,
          sheetName: process.env.GOOGLE_SHEETS_BUYER_SHEET_NAME || '買主リスト',
          serviceAccountKeyPath: './google-service-account.json',
        });
        
        await sheetsClient.authenticate();
        
        // 買主番号を採番
        const allRows = await sheetsClient.readAll();
        const columnEValues = allRows
          .map(row => row['買主番号'])
          .filter(value => value !== null && value !== undefined)
          .map(value => String(value));
        
        const maxNumber = columnEValues.length > 0
          ? Math.max(...columnEValues.map(v => parseInt(v) || 0))
          : 0;
        const buyerNumber = maxNumber + 1;
        
        // 電話番号を正規化
        const normalizedPhone = phone.replace(/[^0-9]/g, '');
        
        // スプレッドシートに追加
        const rowData = {
          '買主番号': buyerNumber.toString(),
          '●氏名・会社名': name,
          '●問合時ヒアリング': message,
          '●電話番号\n（ハイフン不要）': normalizedPhone,
          '●メアド': email,
          '●問合せ元': 'いふう独自サイト',
          '物件番号': propertyNumber || '',
          '【問合メール】電話対応': '未',
        };
        
        await sheetsClient.appendRow(rowData);
        
        // 同期成功をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({ sheet_sync_status: 'synced' })
          .eq('id', inquiry.id);
        
        console.log('[Inquiry API] Background sync completed:', buyerNumber);
      } catch (syncError) {
        console.error('[Inquiry API] Background sync failed:', syncError);
        
        // 同期失敗をデータベースに記録
        await supabase
          .from('property_inquiries')
          .update({ 
            sheet_sync_status: 'failed',
            sync_retry_count: 1
          })
          .eq('id', inquiry.id);
      }
    })();
    
    // ユーザーには即座に成功を返す
    res.status(201).json({
      success: true,
      message: 'お問い合わせを受け付けました。担当者より折り返しご連絡いたします。'
    });
  } catch (error: any) {
    console.error('[Inquiry API] Error:', error);
    res.status(500).json({
      success: false,
      message: 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。'
    });
  }
});
```

---

## 環境変数

### Vercel Dashboard → Settings → Environment Variables

以下の環境変数が設定されています：

- `SUPABASE_URL` - SupabaseプロジェクトのURL
- `SUPABASE_SERVICE_KEY` - Supabaseサービスキー
- `GOOGLE_SERVICE_ACCOUNT_JSON` - Google Sheets認証用のサービスアカウントJSON
- `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` - 買主リストスプレッドシートID
- `GOOGLE_SHEETS_BUYER_SHEET_NAME` - 買主リストシート名（デフォルト: `買主リスト`）

### 重要な注意事項

- `DATABASE_URL`は**不要**です（Supabaseクライアントを使用するため）
- `GOOGLE_SERVICE_ACCOUNT_KEY_PATH`は**不要**です（`GOOGLE_SERVICE_ACCOUNT_JSON`を使用するため）

---

## データベーススキーマ

### property_inquiries テーブル

```sql
CREATE TABLE property_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id UUID REFERENCES property_listings(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  message TEXT NOT NULL,
  sheet_sync_status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
  sync_retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
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

1. **データベースファースト**: まずデータベースに保存
2. **バックグラウンド同期**: スプレッドシート同期は非同期
3. **エラー耐性**: 同期失敗してもユーザーに影響しない

### 絶対に変更してはいけないこと

- ❌ `publicPropertiesRoutes`を有効にしない（ルートの重複）
- ❌ `InquirySyncService`を使用しない（`DATABASE_URL`が必要）
- ❌ スプレッドシート同期を同期処理にしない（タイムアウト）

### 問題が発生したら

1. **このファイルを確認する**
2. **コミット`fee0998`に戻す**
   ```bash
   git show fee0998:backend/api/index.ts > backend/api/index.ts
   git add backend/api/index.ts
   git commit -m "Revert to working inquiry API (commit fee0998)"
   git push
   ```

---

**このドキュメントを保存して、今後の参考にしてください！**
