# デザインドキュメント

## 概要

公開物件サイトの問い合わせフォームから送信された情報を、Googleスプレッドシート「買主リスト」に自動転記する機能を実装します。この機能により、問い合わせ情報の手動転記作業を削減し、迅速な顧客対応を実現します。

転記処理は非同期で実行され、問い合わせフォームの送信自体は即座に完了します。転記の成功・失敗状態はデータベースで管理され、失敗時には自動的に再試行されます。

## アーキテクチャ

### システム構成

```
┌─────────────────┐
│  フロントエンド  │
│ (React)         │
└────────┬────────┘
         │ POST /api/public/inquiries
         ▼
┌─────────────────────────────────┐
│  バックエンドAPI                 │
│  (Express.js)                   │
│                                 │
│  ┌──────────────────────────┐  │
│  │ publicInquiries.ts       │  │
│  │ - 問い合わせ受付         │  │
│  │ - バリデーション         │  │
│  │ - DB保存                 │  │
│  └──────────┬───────────────┘  │
│             │                   │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │ InquirySyncService       │  │
│  │ - 非同期転記処理         │  │
│  │ - 再試行ロジック         │  │
│  │ - エラーハンドリング     │  │
│  └──────────┬───────────────┘  │
│             │                   │
└─────────────┼───────────────────┘
              │
              ▼
┌─────────────────────────────────┐
│  Google Sheets API              │
│  (買主リスト)                    │
│  - 行の追加                      │
│  - 買主番号の採番                │
└─────────────────────────────────┘
```

### データフロー

1. **問い合わせ受付**: ユーザーがフォームを送信
2. **バリデーション**: 入力データの検証
3. **DB保存**: `property_inquiries`テーブルに保存（`sheet_sync_status='pending'`）
4. **即座にレスポンス**: ユーザーに成功メッセージを返す
5. **非同期転記**: バックグラウンドでGoogleスプレッドシートに転記
6. **ステータス更新**: 転記結果に応じて`sheet_sync_status`を更新

## コンポーネントと インターフェース

### 1. データベーススキーマ拡張

`property_inquiries`テーブルに以下のカラムを追加:

```sql
ALTER TABLE property_inquiries
ADD COLUMN sheet_sync_status VARCHAR(20) DEFAULT 'pending',
ADD COLUMN sheet_sync_error_message TEXT,
ADD COLUMN sheet_row_number INTEGER,
ADD COLUMN sheet_synced_at TIMESTAMP,
ADD COLUMN sync_retry_count INTEGER DEFAULT 0;

-- インデックスを追加（未同期の問い合わせを効率的に検索）
CREATE INDEX idx_property_inquiries_sync_status 
ON property_inquiries(sheet_sync_status, created_at);
```

**カラムの説明:**
- `sheet_sync_status`: 同期状態（'pending', 'synced', 'failed'）
- `sheet_sync_error_message`: エラーメッセージ
- `sheet_row_number`: 転記先の行番号
- `sheet_synced_at`: 転記完了日時
- `sync_retry_count`: 再試行回数

### 2. InquirySyncService

問い合わせデータをGoogleスプレッドシートに転記するサービスクラス。

```typescript
interface InquirySyncConfig {
  spreadsheetId: string;
  sheetName: string;
  serviceAccountKeyPath: string;
  maxRetries: number;
  retryDelayMs: number;
}

interface InquiryData {
  id: string;
  property_id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  created_at: string;
}

interface PropertyData {
  property_number: string;
  site_display: boolean;
  athome_public_folder_id: string | null;
}

interface SyncResult {
  success: boolean;
  rowNumber?: number;
  error?: string;
}

class InquirySyncService {
  private sheetsClient: GoogleSheetsClient;
  private supabase: SupabaseClient;
  private config: InquirySyncConfig;

  constructor(config: InquirySyncConfig);
  
  // 問い合わせをスプレッドシートに転記
  async syncInquiry(inquiryId: string): Promise<SyncResult>;
  
  // 未同期の問い合わせを一括処理
  async syncPendingInquiries(): Promise<void>;
  
  // 買主番号を自動採番
  private async generateBuyerNumber(): Promise<number>;
  
  // 問合せ元を判定
  private determineInquirySource(property: PropertyData): string;
  
  // 電話番号を正規化
  private normalizePhoneNumber(phone: string): string;
  
  // 再試行ロジック
  private async retrySync(inquiryId: string, attempt: number): Promise<SyncResult>;
}
```

### 3. APIエンドポイント拡張

既存の`POST /api/public/inquiries`エンドポイントを拡張:

```typescript
router.post('/', 
  createRateLimiter({ windowMs: 60 * 60 * 1000, maxRequests: 3 }),
  async (req: Request, res: Response) => {
    // 1. バリデーション
    // 2. property_inquiriesテーブルに保存（sheet_sync_status='pending'）
    // 3. 即座にレスポンスを返す
    // 4. 非同期で転記処理を開始（await不要）
    
    // 非同期転記（エラーが発生してもユーザーには影響しない）
    inquirySyncService.syncInquiry(inquiry.id)
      .catch(error => {
        console.error('Background sync failed:', error);
      });
    
    return res.status(201).json({ success: true, ... });
  }
);
```

### 4. バックグラウンドジョブ

定期的に未同期の問い合わせを処理するジョブを実装:

```typescript
// cron job or scheduled task
async function syncPendingInquiriesJob() {
  const inquirySyncService = new InquirySyncService(config);
  await inquirySyncService.syncPendingInquiries();
}

// 5分ごとに実行
setInterval(syncPendingInquiriesJob, 5 * 60 * 1000);
```

## データモデル

### フィールドマッピング

| 買主リストの列 | 列名 | データソース | 変換処理 |
|--------------|------|------------|---------|
| E列 | 買主番号 | 自動採番 | 既存の最大数値+1 |
| G列 | 氏名・会社名 | inquiry.name | なし |
| M列 | 問合時ヒアリング | inquiry.message | なし |
| AJ列 | 電話番号 | inquiry.phone | ハイフン・空白・括弧を除去、全角→半角 |
| AK列 | メールアドレス | inquiry.email | なし |
| AL列 | 問合せ元 | property.site_display, athome_public_folder_id | 公開状態に基づく判定 |
| AT列 | 物件番号 | property.property_number | なし |

### 問合せ元の判定ロジック

```typescript
function determineInquirySource(property: PropertyData): string {
  if (property.site_display === true) {
    return '公開中・いふう独自サイト';
  } else if (property.athome_public_folder_id) {
    return '公開前・いふう独自サイト';
  } else {
    return '非公開・いふう独自サイト';
  }
}
```

### 電話番号の正規化

```typescript
function normalizePhoneNumber(phone: string): string {
  return phone
    .replace(/[-\s()（）]/g, '')  // ハイフン、空白、括弧を除去
    .replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));  // 全角→半角
}
```

### 買主番号の採番

```typescript
async function generateBuyerNumber(): Promise<number> {
  // E列のすべての値を取得
  const columnEValues = await sheetsClient.readRange('E2:E');
  
  // 数値のみを抽出
  const numbers = columnEValues
    .map(row => parseInt(row['買主番号'], 10))
    .filter(num => !isNaN(num));
  
  // 最大値を取得（存在しない場合は0）
  const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
  
  return maxNumber + 1;
}
```

## 正確性プロパティ

*プロパティとは、システムのすべての有効な実行において真であるべき特性や動作のことです。これらは人間が読める仕様と機械で検証可能な正確性保証の橋渡しとなります。*

### プロパティ1: 問い合わせの転記

*任意の*有効な問い合わせデータに対して、転記処理を実行すると、Googleスプレッドシート「買主リスト」に新しい行が追加される。

**検証: 要件 1.1**

### プロパティ2: フィールドマッピングの正確性

*任意の*問い合わせデータに対して、転記処理を実行すると、以下のフィールドが正しい列にマッピングされる:
- nameフィールド → G列（氏名・会社名）
- emailフィールド → AK列（メールアドレス）
- 正規化されたphoneフィールド → AJ列（電話番号）
- messageフィールド → M列（問合時ヒアリング）
- 判定されたinquiry_source → AL列（問合せ元）
- property_number → AT列（物件番号）
- 採番されたbuyer_number → E列（買主番号）

**検証: 要件 2.1, 2.2, 2.3, 2.4, 2.5, 2.6**

### プロパティ3: 電話番号の正規化

*任意の*電話番号文字列に対して、正規化処理を実行すると、以下の変換が適用される:
- すべてのハイフン（-）が除去される
- すべての空白文字が除去される
- すべての括弧（()（））が除去される
- すべての全角数字が半角数字に変換される

**検証: 要件 2.3, 5.1, 5.2, 5.3, 5.4**

### プロパティ4: 問合せ元の判定

*任意の*物件データに対して、問合せ元の判定処理を実行すると、以下のルールに従って判定される:
- site_display = true → 「公開中・いふう独自サイト」
- site_display = false かつ athome_public_folder_id が存在 → 「公開前・いふう独自サイト」
- site_display = false かつ athome_public_folder_id が存在しない → 「非公開・いふう独自サイト」

**検証: 要件 2.5, 4.1, 4.2, 4.3**

### プロパティ5: 買主番号の採番

*任意の*スプレッドシートの状態に対して、買主番号の採番処理を実行すると、以下のルールに従って採番される:
- E列に数値が存在する場合: 数値のみを抽出し、最大値+1を返す
- E列に数値が存在しない場合: 1を返す
- E列にテキストが混在する場合: テキストを無視し、数値のみを対象とする

**検証: 要件 3.1, 3.2, 3.3, 3.4**

### プロパティ6: 転記ステータスの更新

*任意の*問い合わせに対して、転記処理の結果に応じて、以下のステータス更新が行われる:
- 転記成功時: sheet_sync_status = 'synced', sheet_row_number = 転記先行番号, sheet_synced_at = 現在時刻
- 転記失敗時: sheet_sync_status = 'failed', sheet_sync_error_message = エラー内容

**検証: 要件 1.2, 1.3, 7.3, 7.4**

### プロパティ7: 非同期処理の独立性

*任意の*問い合わせフォーム送信に対して、転記処理でエラーが発生しても、APIレスポンスは成功（201）を返す。

**検証: 要件 1.4**

### プロパティ8: 再試行メカニズム

*任意の*転記失敗に対して、以下の再試行ロジックが適用される:
- 最大3回まで再試行される
- 各再試行の待機時間は指数バックオフ（1秒、2秒、4秒）に従う
- 3回の再試行後も失敗した場合、sheet_sync_status = 'failed'に設定される
- レート制限エラー（429）の場合、Retry-Afterヘッダーに従って待機時間が調整される

**検証: 要件 6.1, 6.2, 6.3, 6.4**

### プロパティ9: 重複転記の防止

*任意の*問い合わせに対して、以下の重複防止ロジックが適用される:
- sheet_sync_status = 'synced'の場合、転記処理は実行されない
- sheet_sync_status = 'pending'の場合、同じ問い合わせに対する重複した転記処理は開始されない

**検証: 要件 7.1, 7.2**

### プロパティ10: ロギングの完全性

*任意の*転記処理に対して、以下のイベントが適切にログに記録される:
- エラー発生時: エラーの種類、メッセージ、スタックトレース
- APIエラー時: エラーコードとメッセージがsheet_sync_error_messageに記録される
- 採番失敗時: エラー内容がログに記録され、デフォルト値が使用される
- 転記成功時: 転記先の行番号と転記時刻がログに記録される

**検証: 要件 8.1, 8.2, 8.3, 8.4**



## エラーハンドリング

### エラーの種類と対応

| エラーの種類 | 対応方法 | ユーザーへの影響 |
|------------|---------|----------------|
| バリデーションエラー | 即座に400エラーを返す | フォーム送信が失敗 |
| 物件が見つからない | 即座に404エラーを返す | フォーム送信が失敗 |
| DB保存エラー | 即座に500エラーを返す | フォーム送信が失敗 |
| Google Sheets APIエラー | バックグラウンドで再試行 | なし（問い合わせは受付済み） |
| レート制限エラー（429） | Retry-Afterに従って待機後、再試行 | なし（問い合わせは受付済み） |
| ネットワークエラー | 指数バックオフで再試行 | なし（問い合わせは受付済み） |
| 認証エラー | ログに記録し、管理者に通知 | なし（問い合わせは受付済み） |

### エラーログの形式

```typescript
interface ErrorLog {
  timestamp: string;
  inquiryId: string;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  retryCount: number;
  context: {
    propertyId: string;
    buyerNumber?: number;
    rowNumber?: number;
  };
}
```

### 再試行ロジックの詳細

```typescript
async function retrySync(inquiryId: string, attempt: number): Promise<SyncResult> {
  const maxRetries = 3;
  const baseDelay = 1000; // 1秒
  
  if (attempt > maxRetries) {
    // 最大再試行回数を超えた場合
    await updateInquiryStatus(inquiryId, {
      sheet_sync_status: 'failed',
      sheet_sync_error_message: 'Max retries exceeded',
      sync_retry_count: attempt
    });
    
    // 管理者に通知
    await notifyAdmin({
      type: 'sync_failed',
      inquiryId,
      retryCount: attempt
    });
    
    return { success: false, error: 'Max retries exceeded' };
  }
  
  try {
    // 転記処理を実行
    const result = await syncInquiry(inquiryId);
    return result;
  } catch (error) {
    // エラーの種類に応じて待機時間を調整
    let delay = baseDelay * Math.pow(2, attempt - 1); // 指数バックオフ
    
    if (error.status === 429 && error.headers['retry-after']) {
      // レート制限エラーの場合、Retry-Afterヘッダーに従う
      delay = parseInt(error.headers['retry-after']) * 1000;
    }
    
    // ログに記録
    console.error(`Sync failed for inquiry ${inquiryId}, attempt ${attempt}/${maxRetries}`, error);
    
    // 待機後、再試行
    await sleep(delay);
    return retrySync(inquiryId, attempt + 1);
  }
}
```

## テスト戦略

### デュアルテストアプローチ

この機能では、ユニットテストとプロパティベーステストの両方を使用して、包括的なテストカバレッジを実現します。

**ユニットテスト**:
- 特定の例やエッジケースを検証
- 統合ポイント（API、DB、Google Sheets）の動作確認
- エラー条件の検証

**プロパティベーステスト**:
- 普遍的なプロパティを多数の入力で検証
- ランダム化による包括的な入力カバレッジ
- 各プロパティテストは最低100回の反復を実行

### テストライブラリ

- **ユニットテスト**: Jest
- **プロパティベーステスト**: fast-check（TypeScript用）
- **モック**: jest.mock()を使用してGoogle Sheets APIをモック

### テストケース

#### ユニットテスト

1. **APIエンドポイントのテスト**
   - 有効な問い合わせデータで201レスポンスを返す
   - 無効なデータで400エラーを返す
   - 存在しない物件で404エラーを返す
   - レート制限で429エラーを返す

2. **InquirySyncServiceのテスト**
   - 転記処理が成功する
   - 転記失敗時にステータスが'failed'に更新される
   - 再試行ロジックが正しく動作する
   - 重複転記が防止される

3. **ヘルパー関数のテスト**
   - 電話番号の正規化が正しく動作する
   - 問合せ元の判定が正しく動作する
   - 買主番号の採番が正しく動作する

#### プロパティベーステスト

各プロパティテストは、デザインドキュメントのプロパティを検証します。

1. **プロパティ1: 問い合わせの転記**
   ```typescript
   // Feature: public-inquiry-buyer-sync, Property 1: 問い合わせの転記
   test('任意の有効な問い合わせデータに対して、転記処理を実行すると、スプレッドシートに新しい行が追加される', async () => {
     await fc.assert(
       fc.asyncProperty(
         inquiryDataArbitrary(),
         async (inquiryData) => {
           const initialRowCount = await getSheetRowCount();
           await syncInquiry(inquiryData.id);
           const finalRowCount = await getSheetRowCount();
           expect(finalRowCount).toBe(initialRowCount + 1);
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

2. **プロパティ2: フィールドマッピングの正確性**
   ```typescript
   // Feature: public-inquiry-buyer-sync, Property 2: フィールドマッピングの正確性
   test('任意の問い合わせデータに対して、すべてのフィールドが正しい列にマッピングされる', async () => {
     await fc.assert(
       fc.asyncProperty(
         inquiryDataArbitrary(),
         async (inquiryData) => {
           const result = await syncInquiry(inquiryData.id);
           const row = await getSheetRow(result.rowNumber);
           
           expect(row['氏名・会社名']).toBe(inquiryData.name);
           expect(row['メールアドレス']).toBe(inquiryData.email);
           expect(row['電話番号']).toBe(normalizePhoneNumber(inquiryData.phone));
           expect(row['問合時ヒアリング']).toBe(inquiryData.message);
           expect(row['物件番号']).toBe(inquiryData.property_number);
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

3. **プロパティ3: 電話番号の正規化**
   ```typescript
   // Feature: public-inquiry-buyer-sync, Property 3: 電話番号の正規化
   test('任意の電話番号文字列に対して、正規化処理が正しく適用される', () => {
     fc.assert(
       fc.property(
         phoneNumberArbitrary(),
         (phone) => {
           const normalized = normalizePhoneNumber(phone);
           
           // ハイフン、空白、括弧が除去されている
           expect(normalized).not.toMatch(/[-\s()（）]/);
           
           // 全角数字が半角に変換されている
           expect(normalized).not.toMatch(/[０-９]/);
           
           // 数字のみで構成されている
           expect(normalized).toMatch(/^[0-9]+$/);
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

4. **プロパティ4: 問合せ元の判定**
   ```typescript
   // Feature: public-inquiry-buyer-sync, Property 4: 問合せ元の判定
   test('任意の物件データに対して、問合せ元が正しく判定される', () => {
     fc.assert(
       fc.property(
         propertyDataArbitrary(),
         (property) => {
           const source = determineInquirySource(property);
           
           if (property.site_display === true) {
             expect(source).toBe('公開中・いふう独自サイト');
           } else if (property.athome_public_folder_id) {
             expect(source).toBe('公開前・いふう独自サイト');
           } else {
             expect(source).toBe('非公開・いふう独自サイト');
           }
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

5. **プロパティ5: 買主番号の採番**
   ```typescript
   // Feature: public-inquiry-buyer-sync, Property 5: 買主番号の採番
   test('任意のスプレッドシートの状態に対して、買主番号が正しく採番される', async () => {
     await fc.assert(
       fc.asyncProperty(
         buyerNumberColumnArbitrary(),
         async (columnEValues) => {
           const buyerNumber = await generateBuyerNumber(columnEValues);
           
           // 数値のみを抽出
           const numbers = columnEValues
             .map(v => parseInt(v, 10))
             .filter(n => !isNaN(n));
           
           if (numbers.length > 0) {
             const maxNumber = Math.max(...numbers);
             expect(buyerNumber).toBe(maxNumber + 1);
           } else {
             expect(buyerNumber).toBe(1);
           }
         }
       ),
       { numRuns: 100 }
     );
   });
   ```

### テストデータジェネレーター

fast-checkを使用して、ランダムなテストデータを生成します。

```typescript
import * as fc from 'fast-check';

// 問い合わせデータのジェネレーター
function inquiryDataArbitrary() {
  return fc.record({
    id: fc.uuid(),
    property_id: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    email: fc.emailAddress(),
    phone: phoneNumberArbitrary(),
    message: fc.string({ minLength: 1, maxLength: 2000 }),
    created_at: fc.date().map(d => d.toISOString())
  });
}

// 電話番号のジェネレーター（様々な形式）
function phoneNumberArbitrary() {
  return fc.oneof(
    fc.constant('090-1234-5678'),
    fc.constant('09012345678'),
    fc.constant('０９０１２３４５６７８'),
    fc.constant('090 1234 5678'),
    fc.constant('(090) 1234-5678'),
    fc.constant('（090）1234-5678'),
    fc.string({ minLength: 10, maxLength: 15 }).filter(s => /^[0-9０-９\-\s()（）]+$/.test(s))
  );
}

// 物件データのジェネレーター
function propertyDataArbitrary() {
  return fc.record({
    property_number: fc.string({ minLength: 1, maxLength: 20 }),
    site_display: fc.boolean(),
    athome_public_folder_id: fc.option(fc.string(), { nil: null })
  });
}

// 買主番号列のジェネレーター
function buyerNumberColumnArbitrary() {
  return fc.array(
    fc.oneof(
      fc.integer({ min: 1, max: 10000 }).map(n => n.toString()),
      fc.constant('テキスト'),
      fc.constant(''),
      fc.constant('ABC123')
    ),
    { minLength: 0, maxLength: 100 }
  );
}
```

### テスト実行

```bash
# すべてのテストを実行
npm test

# プロパティベーステストのみを実行
npm test -- --testNamePattern="Property"

# カバレッジレポートを生成
npm test -- --coverage
```

### 継続的インテグレーション

- すべてのプルリクエストでテストを自動実行
- テストカバレッジは80%以上を維持
- プロパティベーステストは各プロパティで最低100回の反復を実行
