---
inclusion: always
---

# スプレッドシート設定ガイド

## ⚠️ 重要：スプレッドシートIDの使い分け

このプロジェクトでは**2つの異なるスプレッドシート**を使用しています。
**必ず正しいスプレッドシートIDを使用してください。**

### 📊 スプレッドシート一覧

#### 1. 売主リスト（業務リスト）
- **環境変数**: `GOOGLE_SHEETS_SPREADSHEET_ID`
- **スプレッドシートID**: `1wKBRLWbT6pSKa9IlTDabjhjTnfs_GxX6Rn6M6kbio1I`
- **シート名**: `売主リスト`
- **用途**: 
  - 売主情報の管理
  - 追客ログ
  - おすすめコメント（業務リスト）
  - お気に入り文言

#### 1-2. 業務リスト（業務依頼シート）
- **環境変数**: `GYOMU_LIST_SPREADSHEET_ID`
- **スプレッドシートID**: `1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g`
- **シート名**: `業務依頼`
- **用途**:
  - **おすすめコメント取得用の個別物件スプレッドシートURL**
    - カラム名: `スプシURL` (D列)
    - 各物件の個別スプレッドシートへのリンク
    - 個別スプレッドシート内の`athome`シートからおすすめコメントを取得
  - **画像URL取得用のGoogle DriveフォルダURL**
    - カラム名: `格納先URL` (CO列)
    - 物件の画像が格納されているフォルダへのリンク
- **重要**: 
  - 業務リストにない物件は、物件リスト（ブラウザ）の「格納先URL」から手動入力
  - おすすめコメントと画像URLの取得には、この業務リストが必須

#### 2. 物件リスト
- **環境変数**: `PROPERTY_LISTING_SPREADSHEET_ID`
- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `物件`
- **用途**:
  - **物件情報の管理（property_listings）**
  - **物件の価格、住所、ATBB状態など**
  - **公開物件サイトのデータソース**

#### 3. 買主リスト
- **環境変数**: `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`
- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `買主リスト`
- **用途**: 買主情報の管理

---

## 🚨 よくある間違い

### ❌ 間違い：物件データに売主リストを使用
```typescript
// ❌ 間違い
const sheetsClient = new GoogleSheetsClient({
  spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!, // 売主リスト
  sheetName: '物件' // このシートは存在しない！
});
```

### ✅ 正解：物件データには物件リストを使用
```typescript
// ✅ 正解
const sheetsClient = new GoogleSheetsClient({
  spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!, // 物件リスト
  sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件'
});
```

---

## 📋 サービスごとの使用スプレッドシート

| サービス/機能 | 使用するスプレッドシート | 環境変数 |
|--------------|----------------------|---------|
| PropertyListingSyncService | **物件リスト** | `PROPERTY_LISTING_SPREADSHEET_ID` |
| PropertyService (物件について) | **物件リスト** | `PROPERTY_LISTING_SPREADSHEET_ID` |
| RecommendedCommentService | **業務リスト（業務依頼）** | `GYOMU_LIST_SPREADSHEET_ID` |
| FavoriteCommentService | **物件リスト** | `PROPERTY_LISTING_SPREADSHEET_ID` |
| AthomeDataService | **業務リスト（業務依頼）** | `GYOMU_LIST_SPREADSHEET_ID` |
| SellerSyncService | **売主リスト** | `GOOGLE_SHEETS_SPREADSHEET_ID` |
| BuyerSyncService | **買主リスト** | `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` |

---

## 🔧 コード作成時のチェックリスト

新しいコードを書く前に、以下を確認してください：

1. **どのデータを扱うか？**
   - 物件データ → `PROPERTY_LISTING_SPREADSHEET_ID`
   - 売主データ → `GOOGLE_SHEETS_SPREADSHEET_ID`
   - 買主データ → `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID`

2. **シート名は正しいか？**
   - 物件リスト → `物件`
   - 売主リスト → `売主リスト`
   - 買主リスト → `買主リスト`

3. **環境変数は正しく設定されているか？**
   ```bash
   # .envファイルを確認
   cat backend/.env | grep SPREADSHEET_ID
   ```

---

## 🛠️ トラブルシューティング

### 「物件番号がある行が0行」エラー
**原因**: 売主リストを参照している（物件リストを参照すべき）

**解決策**:
```typescript
// 環境変数を確認
console.log('Using spreadsheet:', process.env.PROPERTY_LISTING_SPREADSHEET_ID);

// GoogleSheetsClientの初期化を修正
const sheetsClient = new GoogleSheetsClient({
  spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!, // ← これを使う
  sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件'
});
```

### データが見つからない
1. スプレッドシートIDが正しいか確認
2. シート名が正しいか確認
3. サービスアカウントに共有権限があるか確認

---

## 📝 新しいスクリプト作成時のテンプレート

```typescript
import dotenv from 'dotenv';
import { GoogleSheetsClient } from '../services/GoogleSheetsClient';

dotenv.config();

async function myScript() {
  // ⚠️ 物件データを扱う場合
  const propertySheets = new GoogleSheetsClient({
    spreadsheetId: process.env.PROPERTY_LISTING_SPREADSHEET_ID!,
    sheetName: process.env.PROPERTY_LISTING_SHEET_NAME || '物件',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  // ⚠️ 売主データを扱う場合
  const sellerSheets = new GoogleSheetsClient({
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID!,
    sheetName: process.env.GOOGLE_SHEETS_SHEET_NAME || '売主リスト',
    serviceAccountKeyPath: process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH || './google-service-account.json',
  });

  await propertySheets.authenticate();
  // ... 処理
}
```

---

## 🎯 まとめ

- **物件データ** = `PROPERTY_LISTING_SPREADSHEET_ID` + シート名`物件`
- **売主データ** = `GOOGLE_SHEETS_SPREADSHEET_ID` + シート名`売主リスト`
- **買主データ** = `GOOGLE_SHEETS_BUYER_SPREADSHEET_ID` + シート名`買主リスト`

**必ずこのガイドを参照してから、スプレッドシート関連のコードを書いてください。**
