# 物件データ取得元マッピング定義

## 📋 概要

このドキュメントは、物件の各データ項目をどのスプレッドシートのどのセルから取得すればよいかを定義します。

---

## 🗂️ スプレッドシート構成

### 1. 業務依頼シート（業務リスト）

**スプレッドシートID**: `1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g`  
**シート名**: `業務依頼`

**用途**: 各物件の個別スプレッドシートURLを取得

| 項目 | 列名 | 説明 |
|------|------|------|
| 物件番号 | `物件番号` | 物件を識別する番号（例: CC100, AA13129） |
| 個別スプレッドシートURL | `スプシURL` | 各物件の詳細データが格納されているスプレッドシートのURL |

**取得方法**:
```typescript
// 1. 業務依頼シートから物件番号で検索
const gyomuListClient = new GoogleSheetsClient({
  spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
  sheetName: '業務依頼',
  serviceAccountKeyPath: './google-service-account.json',
});

const allRows = await gyomuListClient.readAll();
const targetRow = allRows.find(row => row['物件番号'] === 'CC100');
const spreadsheetUrl = targetRow['スプシURL'];

// 2. URLからスプレッドシートIDを抽出
const spreadsheetId = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/)[1];
```

---

### 2. 個別物件スプレッドシート

**スプレッドシートID**: 業務依頼シートの「スプシURL」から取得  
**シート名**: 物件種別によって異なる

#### 2.1. athomeシート

**シート名**: `athome`

**用途**: パノラマURL、おすすめポイント、お気に入り文言を取得

| 項目 | セル位置 | データ型 | 説明 |
|------|----------|----------|------|
| パノラマURL | `N1` | 文字列 | アットホームのパノラマビューURL |
| お気に入り文言 | `B142` | 文字列 | 物件のお気に入りコメント |

**取得方法**:
```typescript
const individualClient = new GoogleSheetsClient({
  spreadsheetId: spreadsheetId, // 業務依頼シートから取得
  sheetName: 'athome',
  serviceAccountKeyPath: './google-service-account.json',
});

// パノラマURL
const panoramaUrl = await individualClient.readCell('N1');

// お気に入り文言
const favoriteComment = await individualClient.readCell('B142');
```

---

#### 2.2. おすすめポイント（物件種別によって範囲が異なる）

**シート名**: `athome`

**取得範囲**: 物件種別によって異なる

| 物件種別 | 種別コード | セル範囲 | 行数 |
|----------|-----------|----------|------|
| 土地 | `土` | `B63:L79` | 17行 |
| 戸建て | `戸` | `B152:L166` | 15行 |
| マンション | `マ` | `B149:L163` | 15行 |

**物件種別の判定方法**:
```typescript
// 業務依頼シートまたは売主リストから物件種別を取得
const propertyType = row['種別']; // '土', '戸', 'マ'

// 種別に応じてセル範囲を決定
let range: string;
if (propertyType === '土') {
  range = 'B63:L79'; // 土地
} else if (propertyType === '戸') {
  range = 'B152:L166'; // 戸建て
} else if (propertyType === 'マ') {
  range = 'B149:L163'; // マンション
} else {
  throw new Error(`Unknown property type: ${propertyType}`);
}
```

**取得方法**:
```typescript
const individualClient = new GoogleSheetsClient({
  spreadsheetId: spreadsheetId,
  sheetName: 'athome',
  serviceAccountKeyPath: './google-service-account.json',
});

// おすすめポイントを取得
const recommendedData = await individualClient.readRange(range);

// 空でない行のみを抽出（B列が空でない行）
const recommendedComments: string[] = [];
for (const row of recommendedData) {
  const comment = row[0]; // B列（インデックス0）
  if (comment && String(comment).trim() !== '') {
    recommendedComments.push(String(comment).trim());
  }
}
```

---

## 📝 データベース保存先

### property_details テーブル

| データ項目 | カラム名 | データ型 | 説明 |
|-----------|---------|---------|------|
| パノラマURL | `athome_data` | jsonb | `[null, "パノラマURL"]` 形式で保存 |
| おすすめポイント | `recommended_comments` | text[] | 文字列配列として保存 |
| お気に入り文言 | `favorite_comment` | text | 文字列として保存 |

**保存方法**:
```typescript
// パノラマURLはJSONB形式で保存（2番目の要素）
const athomeData = [null, panoramaUrl];

// データベースに保存
const { error } = await supabase
  .from('property_details')
  .update({
    athome_data: athomeData,
    recommended_comments: recommendedComments,
    favorite_comment: favoriteComment,
    updated_at: new Date().toISOString(),
  })
  .eq('property_number', propertyNumber);
```

---

## 🔧 実装例：完全な取得フロー

### ステップ1: 業務依頼シートから個別スプレッドシートURLを取得

```typescript
import { GoogleSheetsClient } from './services/GoogleSheetsClient';

async function getIndividualSpreadsheetId(propertyNumber: string): Promise<string> {
  // 業務依頼シートに接続
  const gyomuListClient = new GoogleSheetsClient({
    spreadsheetId: '1MO2vs0mDUFCgM-rjXXPRIy3pKKdfIFvUDwacM-2174g',
    sheetName: '業務依頼',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await gyomuListClient.authenticate();
  
  // 全行を取得
  const allRows = await gyomuListClient.readAll();
  
  // 物件番号で検索
  const targetRow = allRows.find(row => row['物件番号'] === propertyNumber);
  
  if (!targetRow) {
    throw new Error(`Property ${propertyNumber} not found in 業務依頼 sheet`);
  }
  
  const spreadsheetUrl = targetRow['スプシURL'];
  
  if (!spreadsheetUrl) {
    throw new Error(`No spreadsheet URL found for ${propertyNumber}`);
  }
  
  // URLからスプレッドシートIDを抽出
  const match = spreadsheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  
  if (!match) {
    throw new Error(`Invalid spreadsheet URL: ${spreadsheetUrl}`);
  }
  
  return match[1];
}
```

---

### ステップ2: 個別スプレッドシートからデータを取得

```typescript
async function getPropertyData(
  propertyNumber: string,
  propertyType: string
): Promise<{
  panoramaUrl: string | null;
  recommendedComments: string[];
  favoriteComment: string | null;
}> {
  // 1. 個別スプレッドシートIDを取得
  const spreadsheetId = await getIndividualSpreadsheetId(propertyNumber);
  
  // 2. athomeシートに接続
  const athomeClient = new GoogleSheetsClient({
    spreadsheetId: spreadsheetId,
    sheetName: 'athome',
    serviceAccountKeyPath: './google-service-account.json',
  });
  
  await athomeClient.authenticate();
  
  // 3. パノラマURLを取得（N1セル）
  const panoramaUrl = await athomeClient.readCell('N1');
  
  // 4. お気に入り文言を取得（B142セル）
  const favoriteComment = await athomeClient.readCell('B142');
  
  // 5. おすすめポイントを取得（物件種別に応じて範囲を決定）
  let range: string;
  if (propertyType === '土') {
    range = 'B63:L79'; // 土地
  } else if (propertyType === '戸') {
    range = 'B152:L166'; // 戸建て
  } else if (propertyType === 'マ') {
    range = 'B149:L163'; // マンション
  } else {
    throw new Error(`Unknown property type: ${propertyType}`);
  }
  
  const recommendedData = await athomeClient.readRange(range);
  
  // 空でない行のみを抽出
  const recommendedComments: string[] = [];
  for (const row of recommendedData) {
    const comment = row[0]; // B列
    if (comment && String(comment).trim() !== '') {
      recommendedComments.push(String(comment).trim());
    }
  }
  
  return {
    panoramaUrl: panoramaUrl ? String(panoramaUrl) : null,
    recommendedComments,
    favoriteComment: favoriteComment ? String(favoriteComment) : null,
  };
}
```

---

### ステップ3: データベースに保存

```typescript
import { createClient } from '@supabase/supabase-js';

async function savePropertyData(
  propertyNumber: string,
  data: {
    panoramaUrl: string | null;
    recommendedComments: string[];
    favoriteComment: string | null;
  }
): Promise<void> {
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  // パノラマURLをJSONB形式に変換
  const athomeData = [null, data.panoramaUrl];
  
  // データベースに保存
  const { error } = await supabase
    .from('property_details')
    .update({
      athome_data: athomeData,
      recommended_comments: data.recommendedComments,
      favorite_comment: data.favoriteComment,
      updated_at: new Date().toISOString(),
    })
    .eq('property_number', propertyNumber);
  
  if (error) {
    throw new Error(`Failed to save data: ${error.message}`);
  }
  
  console.log(`✅ ${propertyNumber}: Data saved successfully`);
}
```

---

## 🎯 完全な同期スクリプト例

```typescript
// backend/sync-property-panorama-and-recommended.ts

import { createClient } from '@supabase/supabase-js';
import { GoogleSheetsClient } from './src/services/GoogleSheetsClient';

async function syncPropertyData(propertyNumber: string) {
  try {
    console.log(`🔄 Syncing ${propertyNumber}...`);
    
    // 1. 物件種別を取得（売主リストまたはproperty_listingsから）
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const { data: property, error: propertyError } = await supabase
      .from('property_listings')
      .select('property_type')
      .eq('property_number', propertyNumber)
      .single();
    
    if (propertyError || !property) {
      throw new Error(`Property ${propertyNumber} not found in database`);
    }
    
    // 物件種別を短縮形に変換
    let propertyTypeCode: string;
    if (property.property_type === '土地') {
      propertyTypeCode = '土';
    } else if (property.property_type === '戸建て' || property.property_type === '戸建') {
      propertyTypeCode = '戸';
    } else if (property.property_type === 'マンション') {
      propertyTypeCode = 'マ';
    } else {
      throw new Error(`Unknown property type: ${property.property_type}`);
    }
    
    // 2. 個別スプレッドシートIDを取得
    const spreadsheetId = await getIndividualSpreadsheetId(propertyNumber);
    console.log(`📊 Spreadsheet ID: ${spreadsheetId}`);
    
    // 3. データを取得
    const data = await getPropertyData(propertyNumber, propertyTypeCode);
    console.log(`📦 Data retrieved:`, {
      panoramaUrl: data.panoramaUrl ? 'Found' : 'Not found',
      recommendedComments: `${data.recommendedComments.length} items`,
      favoriteComment: data.favoriteComment ? 'Found' : 'Not found',
    });
    
    // 4. データベースに保存
    await savePropertyData(propertyNumber, data);
    
    console.log(`✅ ${propertyNumber}: Sync completed successfully`);
    
  } catch (error: any) {
    console.error(`❌ ${propertyNumber}: Sync failed:`, error.message);
    throw error;
  }
}

// 実行
const propertyNumber = process.argv[2];
if (!propertyNumber) {
  console.error('Usage: npx ts-node sync-property-panorama-and-recommended.ts <PROPERTY_NUMBER>');
  process.exit(1);
}

syncPropertyData(propertyNumber)
  .then(() => {
    console.log('🎉 Sync completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Sync failed:', error);
    process.exit(1);
  });
```

---

## 📚 よくある質問

### Q1: 物件種別がわからない場合は？

**A**: 以下の順序で確認してください：

1. `property_listings`テーブルの`property_type`カラム
2. 業務依頼シートの`種別`列
3. 売主リストの`種別`列

### Q2: 個別スプレッドシートURLが見つからない場合は？

**A**: 以下を確認してください：

1. 業務依頼シートに物件番号が存在するか？
2. `スプシURL`列に値が入力されているか？
3. URLの形式が正しいか？（`https://docs.google.com/spreadsheets/d/...`）

### Q3: おすすめポイントが空の場合は？

**A**: 正常です。以下の場合、おすすめポイントは空配列になります：

- セル範囲内のB列がすべて空
- 物件種別が不明
- athomeシートが存在しない

### Q4: パノラマURLが見つからない場合は？

**A**: 以下を確認してください：

1. athomeシートが存在するか？
2. N1セルに値が入力されているか？
3. URLの形式が正しいか？（`https://vrpanorama.athome.jp/...`）

---

## 🔍 デバッグ用コマンド

### 業務依頼シートの確認

```bash
# 物件番号で検索
npx ts-node backend/check-property-in-gyomu-list.ts CC100
```

### 個別スプレッドシートの確認

```bash
# athomeシートの存在確認
npx ts-node backend/check-property-athome-sheet.ts CC100

# N1セルの確認
npx ts-node backend/check-property-panorama-url.ts CC100

# おすすめポイントの確認
npx ts-node backend/check-property-recommended-comments.ts CC100
```

---

## ✅ チェックリスト

新規物件を同期する前に、以下を確認してください：

- [ ] 業務依頼シートに物件番号が存在する
- [ ] `スプシURL`列に個別スプレッドシートURLが入力されている
- [ ] 個別スプレッドシートに`athome`シートが存在する
- [ ] 物件種別が正しく設定されている（`土`, `戸`, `マ`）
- [ ] N1セルにパノラマURLが入力されている（オプション）
- [ ] B142セルにお気に入り文言が入力されている（オプション）
- [ ] おすすめポイントのセル範囲にデータが入力されている（オプション）

---

**最終更新日**: 2026年1月26日  
**ステータス**: ✅ 定義完了

---

## 📞 Kiroへの伝え方

今後、新規物件や更新物件で同期されていない場合は、以下のように伝えてください：

```
【物件番号】が同期されていない。
パノラマとおすすめポイントが表示されない。
```

**例**:
```
CC101が同期されていない。
パノラマとおすすめポイントが表示されない。
```

Kiroは、このドキュメント（`PROPERTY_DATA_SOURCE_MAPPING.md`）を参照して、自動的に以下を実行します：

1. 業務依頼シートから個別スプレッドシートURLを取得
2. 物件種別を確認
3. athomeシートからパノラマURL、おすすめポイント、お気に入り文言を取得
4. データベースに保存
5. 確認

**これで、毎回どのシートのどのセルを取得すればよいかを伝える必要はありません。**
