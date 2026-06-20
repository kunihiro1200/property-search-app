# Athomeシート セル位置マッピング

## 概要

個別物件スプレッドシートの「athome」シートから取得するデータのセル位置を定義します。

**重要**: このドキュメントは、コメントデータを取得する際に**必ず参照**してください。

---

## データ取得の流れ

1. 業務リストスプレッドシート（`GYOMU_LIST_SPREADSHEET_ID`）の「業務依頼」シートから物件番号で検索
2. 「スプシURL」列（D列）から個別物件スプレッドシートのURLを取得
3. 個別物件スプレッドシートの「athome」シートから以下のデータを取得

---

## セル位置マッピング

### 1. お気に入り文言 (favorite_comment)

| 物件種別 | セル位置 |
|---------|---------|
| 土地 | **B53** |
| 戸建て | **B142** |
| マンション | **B150** |

**データ型**: 文字列（単一セル）

---

### 2. アピールポイント (recommended_comments)

| 物件種別 | セル範囲 |
|---------|---------|
| 土地 | **B63:L79** |
| 戸建て | **B152:L166** |
| マンション | **B149:L163** |

**データ型**: 文字列配列（複数行）

**取得方法**:
- 範囲内の全行を取得
- 各行の全セル（B列からL列）を結合
- 空でない行のみを配列に追加

---

### 3. 内覧時伝達事項 (property_about)

**セル位置**: 動的（A列とB列で検索）

**取得方法**:
1. A列で「内覧時伝達事項」を含むセルを検索
2. 見つかった行の次の行のB列が値

**例**:
```
Row 50: [A50] 内覧時伝達事項
Row 51: [B51] ← この値を取得
```

---

### 4. パノラマURL (panorama_url)

**セル位置**: 動的（A列とB列で検索）

**取得方法**:
1. A列で「パノラマ」を含むセルを検索
2. 同じ行または次の行のB列でURLを探す

**例**:
```
Row 1: [A1] ... [M1] パノラマ→ [N1] https://...
```

---

## 実装例

### TypeScript

```typescript
// 物件種別に応じたセル位置を取得
function getCellPositions(propertyType: string) {
  const mapping = {
    '土地': {
      favoriteComment: 'B53',
      recommendedComments: 'B63:L79',
    },
    '戸建': {
      favoriteComment: 'B142',
      recommendedComments: 'B152:L166',
    },
    'マンション': {
      favoriteComment: 'B150',
      recommendedComments: 'B149:L163',
    },
  };
  
  return mapping[propertyType] || null;
}

// お気に入り文言を取得
async function getFavoriteComment(spreadsheetId: string, propertyType: string) {
  const positions = getCellPositions(propertyType);
  if (!positions) return null;
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `athome!${positions.favoriteComment}`,
  });
  
  return response.data.values?.[0]?.[0] || null;
}

// アピールポイントを取得
async function getRecommendedComments(spreadsheetId: string, propertyType: string) {
  const positions = getCellPositions(propertyType);
  if (!positions) return [];
  
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `athome!${positions.recommendedComments}`,
  });
  
  const rows = response.data.values || [];
  const comments: string[] = [];
  
  rows.forEach(row => {
    const text = row.join(' ').trim();
    if (text) {
      comments.push(text);
    }
  });
  
  return comments;
}
```

---

## 注意事項

1. **物件種別の判定**:
   - 物件種別は`property_listings`テーブルの`property_type`列から取得
   - 値: `land` (土地), `detached_house` (戸建て), `apartment` (マンション)

2. **セル位置の固定**:
   - 上記のセル位置は固定です
   - スプレッドシートのテンプレートが変更されない限り、これらの位置は変わりません

3. **空データの扱い**:
   - セルが空の場合は`null`を返す
   - 配列の場合は空配列`[]`を返す

4. **データベースへの保存**:
   - 取得したデータは`property_details`テーブルに保存
   - `favorite_comment`: TEXT型
   - `recommended_comments`: JSONB型（配列）
   - `property_about`: TEXT型
   - `athome_data`: JSONB型（配列）

---

## 更新履歴

- 2026-01-27: 初版作成
