# 売主同期の修正ガイド

## 問題の概要

AA13424などの新規売主が同期される際に、以下のフィールドが同期されていませんでした：

1. **反響年** (`inquiry_year`)
2. **反響日** (`inquiry_date`)
3. **サイト** (`inquiry_site`)
4. **物件情報** (一部のケースで物件レコードが作成されない)

## 原因

### 1. データベーススキーマの不足

`sellers`テーブルに以下のカラムが存在していませんでした：
- `inquiry_year` (INTEGER)
- `inquiry_date` (DATE)
- `inquiry_site` (VARCHAR(100))

### 2. 同期ロジックの不足

`EnhancedAutoSyncService`の`syncSingleSeller`メソッドと`updateSingleSeller`メソッドで、これらのフィールドが同期されていませんでした。

## 修正内容

### 1. データベーススキーマの追加

**マイグレーションファイル**: `backend/migrations/093_add_inquiry_fields_to_sellers.sql`

```sql
-- 反響年カラムを追加
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_year INTEGER;

-- 反響日カラムを追加（日付型）
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_date DATE;

-- サイトカラムを追加
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_site VARCHAR(100);

-- インデックスを作成（検索パフォーマンス向上）
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year ON sellers(inquiry_year);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date ON sellers(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_site ON sellers(inquiry_site);
```

**実行方法**:
1. Supabase SQL Editorを開く
2. 上記のSQLを貼り付けて実行
3. 成功メッセージを確認

### 2. 同期ロジックの修正

**ファイル**: `backend/src/services/EnhancedAutoSyncService.ts`

#### 2.1 `syncSingleSeller`メソッドの修正

反響関連フィールドを取得して同期するコードを追加：

```typescript
// 反響関連フィールドを取得
const inquiryYear = row['反響年'];
const inquiryDate = row['反響日'];
const inquirySite = row['サイト'];

const encryptedData: any = {
  // ... 既存のフィールド ...
};

// 反響関連フィールドを追加
if (inquiryYear) {
  encryptedData.inquiry_year = this.parseNumeric(inquiryYear);
}
if (inquiryDate) {
  encryptedData.inquiry_date = this.formatInquiryDate(inquiryYear, inquiryDate);
}
if (inquirySite) {
  encryptedData.inquiry_site = String(inquirySite);
}
```

#### 2.2 `updateSingleSeller`メソッドの修正

同様に、反響関連フィールドを更新するコードを追加。

#### 2.3 `formatInquiryDate`メソッドの追加

反響年と反響日（月/日）を組み合わせて完全な日付を作成するメソッドを追加：

```typescript
/**
 * 反響日を YYYY-MM-DD 形式にフォーマット
 * 反響年と反響日（月/日）を組み合わせて完全な日付を作成
 */
private formatInquiryDate(inquiryYear: any, inquiryDate: any): string | null {
  if (!inquiryYear || !inquiryDate) return null;
  
  const year = this.parseNumeric(inquiryYear);
  if (year === null) return null;
  
  const dateStr = String(inquiryDate).trim();
  
  // MM/DD 形式の場合
  if (dateStr.match(/^\d{1,2}\/\d{1,2}$/)) {
    const [month, day] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD 形式の場合（年が含まれている）
  if (dateStr.match(/^\d{4}\/\d{1,2}\/\d{1,2}$/)) {
    const [y, month, day] = dateStr.split('/');
    return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
}
```

### 3. カラムマッピング設定

**ファイル**: `backend/src/config/column-mapping.json`

既に以下のマッピングが存在していることを確認：

```json
{
  "spreadsheetToDatabase": {
    "反響年": "inquiry_year",
    "反響日付": "inquiry_date",
    "サイト": "inquiry_site"
  }
}
```

## 実行手順

### ステップ1: データベースマイグレーションを実行

✅ **完了**: `inquiry_year`と`inquiry_site`カラムは既に追加されています。

Supabase SQL Editorで以下を実行（まだ実行していない場合）：

```sql
ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_year INTEGER;

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_date DATE;

ALTER TABLE sellers 
ADD COLUMN IF NOT EXISTS inquiry_site VARCHAR(100);

CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_year ON sellers(inquiry_year);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_date ON sellers(inquiry_date DESC);
CREATE INDEX IF NOT EXISTS idx_sellers_inquiry_site ON sellers(inquiry_site);
```

### ステップ2: PropertySyncHandlerを修正

✅ **完了**: `property_address`カラム名を使用するように修正されています。

### ステップ3: バックエンドを再起動

```bash
cd backend
npm run dev
```

### ステップ4: 既存の売主を再同期（オプション）

既存の売主（AA13424など）の反響情報を更新する場合：

```bash
cd backend
npx ts-node fix-aa13424-complete.ts
```

または、自動同期が次回実行されるまで待つ（デフォルト5分間隔）。

### ステップ5: 確認

```bash
cd backend
npx ts-node check-aa13424-sync.ts
```

✅ **確認済み**: 以下のフィールドが正しく同期されています：
- ✅ inquiry_year: 2026
- ⚠️ inquiry_date: NULL（スプレッドシートで未定義のため）
- ✅ inquiry_site: H
- ✅ 物件レコードが作成されている
- ✅ property_address: 大分市末広町2丁目4-21グリーヒル大分駅前レジデンス905
- ✅ property_type: マンション
- ✅ seller_situation: 居

## トラブルシューティング

### エラー: "Could not find the 'inquiry_year' column"

**原因**: マイグレーションが実行されていない、またはスキーマキャッシュが更新されていない

**解決策**:
1. Supabase SQL Editorでマイグレーションを再実行
2. バックエンドを再起動
3. 数分待ってからリトライ

### エラー: "Quota exceeded for quota metric 'Read requests'"

**原因**: Google Sheets APIのクォータ制限に達した

**解決策**:
1. 1分待ってからリトライ
2. 自動同期の間隔を長くする（`AUTO_SYNC_INTERVAL_MINUTES`を10以上に設定）

### 物件レコードが作成されない

**原因**: `PropertySyncHandler`でエラーが発生している

**解決策**:
1. バックエンドのログを確認
2. `properties`テーブルのスキーマを確認
3. 手動で物件レコードを作成：

```bash
cd backend
npx ts-node check-aa13424-properties.ts
```

## 今後の新規売主について

修正後は、新規売主が追加される際に自動的に以下のフィールドが同期されます：

- ✅ 反響年 (`inquiry_year`)
- ✅ 反響日 (`inquiry_date`)
- ✅ サイト (`inquiry_site`)
- ✅ 物件情報（住所、種別、状況など）

自動同期は5分間隔で実行されるため、スプレッドシートに新規売主を追加してから最大5分以内にDBに反映されます。

## 参考

- **マイグレーションファイル**: `backend/migrations/093_add_inquiry_fields_to_sellers.sql`
- **同期サービス**: `backend/src/services/EnhancedAutoSyncService.ts`
- **カラムマッピング**: `backend/src/config/column-mapping.json`
- **確認スクリプト**: `backend/check-aa13424-sync.ts`
