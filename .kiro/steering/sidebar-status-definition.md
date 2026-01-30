# サイドバーステータス定義（絶対に間違えないルール）

## ⚠️ 重要：サイドバーステータスの定義

売主リストページのサイドバーに表示されるステータスカテゴリの定義です。
**絶対に混同しないでください。**

---

## 📋 サイドバーステータス一覧

### 1. 「当日TEL分」

**サイドバー表示**: `当日TEL分`
**色**: 赤（error）

**条件**:
- 状況（当社）に「追客中」が含まれる
- 次電日が今日以前
- **コミュニケーション情報（3つのフィールド）が全て空**

**コミュニケーション情報の3つのフィールド**:
1. `contact_method`（連絡方法）
2. `preferred_contact_time`（連絡取りやすい時間）
3. `phone_contact_person`（電話担当）

**重要**: コミュニケーション情報のいずれかに入力がある売主は「当日TEL分」に**含まれない**

---

### 2. 「当日TEL（内容）」

**サイドバー表示**: `当日TEL（内容）`
**色**: 紫（secondary）

**条件**:
- 状況（当社）に「追客中」が含まれる
- 次電日が今日以前
- **コミュニケーション情報のいずれかに入力がある**

**例**:
- AA13489: `contact_method = "Eメール"` → 当日TEL(Eメール)
- AA13507: `phone_contact_person = "Y"` → 当日TEL(Y)

**表示優先順位**:
1. 連絡方法 → 当日TEL(Eメール)
2. 連絡取りやすい時間 → 当日TEL(午前中)
3. 電話担当 → 当日TEL(Y)

---

### 3. 「未査定」

**サイドバー表示**: `未査定`
**色**: オレンジ（warning）

**条件**:
- 査定額1, 2, 3が全て空欄（null, undefined, 0）
- 反響日付が2025/12/8以降
- 査定不要ではない
- 営担（visitAssignee）が空欄

---

### 4. 「査定（郵送）」

**サイドバー表示**: `査定（郵送）`
**色**: 青（info）

**条件**:
- 郵送ステータス（mailingStatus）が「未」

---

## 🔍 実装ファイル

### フィルタリングロジック

**ファイル**: `frontend/src/utils/sellerStatusFilters.ts`

**関数**:
- `isTodayCall()` - 当日TEL分の判定
- `isTodayCallWithInfo()` - 当日TEL（内容）の判定
- `getTodayCallWithInfoLabel()` - 当日TEL（内容）の表示ラベル取得
- `isUnvaluated()` - 未査定の判定
- `isMailingPending()` - 査定（郵送）の判定

### ステータス表示ロジック

**ファイル**: `frontend/src/utils/sellerStatusUtils.ts`

**関数**:
- `calculateSellerStatus()` - 売主のステータスを計算（テーブルのステータス列用）

### サイドバーUI

**ファイル**: `frontend/src/pages/SellersPage.tsx`

**カテゴリ型**: `StatusCategory`
- `'all'` - 全て
- `'todayCall'` - 当日TEL分
- `'todayCallWithInfo'` - 当日TEL（内容）
- `'unvaluated'` - 未査定
- `'mailingPending'` - 査定（郵送）

---

## 🚨 よくある間違い

### ❌ 間違い1: 「当日TEL分」にコミュニケーション情報ありの売主を含める

```typescript
// ❌ 間違い（コミュニケーション情報をチェックしていない）
const isTodayCall = (seller) => {
  return seller.status.includes('追客中') && isTodayOrBefore(seller.nextCallDate);
};
```

```typescript
// ✅ 正しい（コミュニケーション情報が全て空かチェック）
const isTodayCall = (seller) => {
  return seller.status.includes('追客中') && 
         isTodayOrBefore(seller.nextCallDate) &&
         !hasContactInfo(seller);  // コミュニケーション情報が全て空
};
```

### ❌ 間違い2: 「当日TEL（内容）」を別カテゴリとして分離しない

```typescript
// ❌ 間違い（全て「当日TEL分」に含めてしまう）
categoryCounts.todayCall = sellers.filter(isTodayCall).length;
```

```typescript
// ✅ 正しい（2つのカテゴリに分離）
categoryCounts.todayCall = sellers.filter(isTodayCall).length;           // コミュニケーション情報なし
categoryCounts.todayCallWithInfo = sellers.filter(isTodayCallWithInfo).length;  // コミュニケーション情報あり
```

---

## 📊 具体例

### AA13489

**データ**:
- `status`: "追客中"
- `next_call_date`: "2026/1/30"（今日以前）
- `contact_method`: "Eメール"
- `preferred_contact_time`: ""
- `phone_contact_person`: ""

**判定**:
- ✅ 状況（当社）に「追客中」が含まれる
- ✅ 次電日が今日以前
- ❌ コミュニケーション情報が全て空ではない（`contact_method = "Eメール"`）

**結果**: 「当日TEL分」には**含まれない** → 「当日TEL（内容）」に分類

---

### AA13507

**データ**:
- `status`: "追客中"
- `next_call_date`: "2026/1/30"（今日以前）
- `contact_method`: ""
- `preferred_contact_time`: ""
- `phone_contact_person`: "Y"

**判定**:
- ✅ 状況（当社）に「追客中」が含まれる
- ✅ 次電日が今日以前
- ❌ コミュニケーション情報が全て空ではない（`phone_contact_person = "Y"`）

**結果**: 「当日TEL分」には**含まれない** → 「当日TEL（内容）」に分類

---

## まとめ

**サイドバーステータスの定義**:

| ステータス | 条件 | 色 |
|-----------|------|-----|
| 当日TEL分 | 追客中 + 次電日が今日以前 + **コミュニケーション情報が全て空** | 赤 |
| 当日TEL（内容） | 追客中 + 次電日が今日以前 + **コミュニケーション情報のいずれかに入力あり** | 紫 |
| 未査定 | 査定額が全て空 + 反響日付が2025/12/8以降 + 営担が空 | オレンジ |
| 査定（郵送） | 郵送ステータスが「未」 | 青 |

**このルールを徹底することで、ステータスの混同を完全に防止できます。**

---

**最終更新日**: 2026年1月30日  
**作成理由**: サイドバーステータスの定義を明確化し、同じ間違いを繰り返さないため
