# コメントデータ取得元完全ガイド

**最終更新**: 2026年1月28日  
**重要**: このドキュメントは、コメントデータの取得元を定義する唯一の正式ドキュメントです。

---

## 📋 概要

物件のコメントデータ（お気に入り文言、アピールポイント、こちらの物件について）は、**2つの異なるスプレッドシート**から取得されます。

---

## 🗂️ データソース一覧

### データソース1: 物件スプレッドシート（共通）

**スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`  
**シート名**: `物件`  
**用途**: 「こちらの物件について」を取得

### データソース2: 個別物件スプレッドシート

**スプレッドシートID**: 業務リスト（`業務依頼`シート）の`スプシURL`列から取得  
**シート名**: `athome` または `athome `（末尾スペース）  
**用途**: 「お気に入り文言」「アピールポイント」「こちらの物件について（代替）」を取得

---

## 📊 各コメントの取得ルール

### 1️⃣ お気に入り文言 (`favorite_comment`)

#### データソース
- **スプレッドシート**: 個別物件スプレッドシート
- **シート名**: `athome` または `athome `
- **セル位置**: 物件種別によって異なる

| 物件種別 | セル位置 |
|---------|---------|
| 土地 (`land`) | **B53** |
| 戸建て (`detached_house`) | **B142** |
| マンション (`apartment`) | **B150** |

#### 取得タイミング
1. `PropertyListingSyncService`の同期時（`FavoriteCommentService`）
2. `/complete`エンドポイントの自動同期（`AthomeSheetSyncService`）

#### 実装サービス
- `FavoriteCommentService.getFavoriteComment()`
- `AthomeSheetSyncService.fetchCommentsFromAthomeSheet()`

---

### 2️⃣ アピールポイント (`recommended_comments`)

#### データソース
- **スプレッドシート**: 個別物件スプレッドシート
- **シート名**: `athome` または `athome `
- **セル範囲**: 物件種別によって異なる

| 物件種別 | セル範囲 |
|---------|---------|
| 土地 (`land`) | **B63:L79** |
| 戸建て (`detached_house`) | **B152:L166** |
| マンション (`apartment`) | **B149:L163** |

#### 取得方法
- 範囲内の全行を取得
- 空でない行のみを配列に追加
- 行構造を保持（横並びで表示）

#### 取得タイミング
1. `PropertyListingSyncService`の同期時（`RecommendedCommentService`）
2. `/complete`エンドポイントの自動同期（`AthomeSheetSyncService`）

#### 実装サービス
- `RecommendedCommentService.getRecommendedComment()`
- `AthomeSheetSyncService.fetchCommentsFromAthomeSheet()`

---

### 3️⃣ こちらの物件について (`property_about`)

**⚠️ 重要**: このデータは**常に物件スプレッドシートから取得**します。個別物件スプレッドシート（athomeシート）からは**絶対に取得しません**。

#### データソース: 物件スプレッドシート（唯一のソース）

- **スプレッドシートID**: `1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`
- **シート名**: `物件`
- **列**: **BQ列**
- **カラム名**: `●内覧前伝達事項`

**取得方法**:
1. `物件`シートで物件番号を検索（`物件番号`列）
2. 該当行のBQ列（`●内覧前伝達事項`）を取得

**取得タイミング**:
- `PropertyListingSyncService`の同期時（`PropertyService.getPropertyAbout()`）

**実装サービス**:
- `PropertyService.getPropertyAbout()`

**重要な注意事項**:
- ❌ 個別物件スプレッドシート（athomeシート）からは取得しない
- ❌ 動的検索（「内覧時伝達事項」）は使用しない
- ✅ 常に物件スプレッドシートのBQ列から取得

---

## 🔄 同期フロー詳細

### フロー1: `PropertyListingSyncService`による同期

**タイミング**: 物件データの手動同期時

```typescript
// 1. お気に入り文言を取得
favoriteCommentService.getFavoriteComment(property.id)
// → 個別物件スプレッドシートのathomeシート（B53/B142/B150）

// 2. アピールポイントを取得
recommendedCommentService.getRecommendedComment(propertyNumber, propertyType, property.id)
// → 個別物件スプレッドシートのathomeシート（B63:L79/B152:L166/B149:L163）

// 3. こちらの物件についてを取得
propertyService.getPropertyAbout(propertyNumber)
// → 物件スプレッドシート（1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY）
//    の物件シートのBQ列（●内覧前伝達事項）
```

### フロー2: `/complete`エンドポイントの自動同期

**タイミング**: 公開物件詳細画面の初回アクセス時（コメントデータがnullの場合）

```typescript
// コメントデータがnullの場合のみ実行
if (!details.favorite_comment && !details.recommended_comments) {
  // AthomeSheetSyncServiceを使用
  athomeSheetSyncService.syncPropertyComments(propertyNumber, propertyType)
  // → 個別物件スプレッドシートのathomeシートから取得
  //   - お気に入り文言: B53/B142/B150
  //   - アピールポイント: B63:L79/B152:L166/B149:L163
  //   ⚠️ property_aboutは取得しない（物件シートから取得するため）
}
```

---

## 📝 データソース優先順位

### `property_about`（こちらの物件について）

**唯一のデータソース**: 物件スプレッドシート（`1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`）のBQ列

- ✅ 常に物件スプレッドシートのBQ列から取得
- ❌ 個別物件スプレッドシート（athomeシート）からは取得しない
- ❌ 優先順位や代替ソースは存在しない

**理由**: 
- 物件スプレッドシートは全物件の共通データベース
- BQ列（`●内覧前伝達事項`）が唯一の正式なデータソース
- データの一貫性を保つため、単一ソースから取得

---

## 🎯 実装サービス一覧

| コメント種類 | サービス | データソース | セル位置/範囲 |
|------------|---------|------------|-------------|
| **お気に入り文言** | `FavoriteCommentService` | 個別物件スプレッドシート（athome） | B53/B142/B150 |
| **お気に入り文言** | `AthomeSheetSyncService` | 個別物件スプレッドシート（athome） | B53/B142/B150 |
| **アピールポイント** | `RecommendedCommentService` | 個別物件スプレッドシート（athome） | B63:L79/B152:L166/B149:L163 |
| **アピールポイント** | `AthomeSheetSyncService` | 個別物件スプレッドシート（athome） | B63:L79/B152:L166/B149:L163 |
| **こちらの物件について** | `PropertyService` | **物件スプレッドシート（物件シート）** | **BQ列（●内覧前伝達事項）** |

---

## ⚠️ よくある間違い

### ❌ 間違い1: 「こちらの物件について」を売主リストから取得

**間違った説明**:
> 売主リストの`物件`シートから取得

**正しい説明**:
> **物件スプレッドシート**（`1tI_iXaiLuWBggs5y0RH7qzkbHs9wnLLdRekAmjkhcLY`）の`物件`シートから取得

**重要**: 
- 売主リスト ≠ 物件スプレッドシート
- 物件スプレッドシートは全物件の共通データベース

### ❌ 間違い2: セル位置を間違える

**よくある間違い**:
- お気に入り文言: B8セルを検索する
- こちらの物件について: 列名を間違える

**正しい情報**:
- お気に入り文言: B53/B142/B150（物件種別によって異なる）
- こちらの物件について: BQ列（`●内覧前伝達事項`）

---

## 🔍 デバッグ用コマンド

### 物件スプレッドシートの確認

```bash
# 物件番号で検索してBQ列を確認
npx ts-node backend/check-property-about-from-property-sheet.ts AA13453
```

### 個別物件スプレッドシートの確認

```bash
# athomeシートから「こちらの物件について」を確認
npx ts-node backend/check-property-about-from-athome-sheet.ts AA13453
```

---

## 📞 Kiroへの伝え方

今後、コメントデータの取得元について質問する場合は、以下のように伝えてください：

```
コメントデータの取得元を確認して。
COMMENT_DATA_SOURCE_COMPLETE_GUIDE.mdを参照。
```

**このドキュメントを参照することで**:
- ✅ 正確なデータソースを確認できる
- ✅ セル位置を間違えない
- ✅ 同期フローを理解できる

---

## 📚 関連ドキュメント

- `ATHOME_SHEET_CELL_MAPPING.md`: 個別物件スプレッドシートのセル位置マッピング
- `PROPERTY_DATA_SOURCE_MAPPING.md`: 物件データ全般の取得元マッピング

---

**最終更新日**: 2026年1月28日  
**ステータス**: ✅ 定義完了
