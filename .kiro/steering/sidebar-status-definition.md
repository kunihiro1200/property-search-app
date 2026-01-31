# サイドバーステータス定義（絶対に間違えないルール）

## ⚠️ 重要：サイドバーステータスの定義

売主リストページのサイドバーに表示されるステータスカテゴリの定義です。
**絶対に混同しないでください。**

---

## 📋 サイドバーステータス一覧

### 1. 「訪問予定（イニシャル）」

**サイドバー表示**: `①訪問予定`
**色**: 緑（success）

**条件**:
- 営担（visitAssignee）に入力がある
- 訪問日（visitDate）が今日以降

**表示例**:
- 訪問予定(Y)
- 訪問予定(I)

**重要**: 訪問予定は他のステータスより優先される

---

### 2. 「訪問済み（イニシャル）」

**サイドバー表示**: `②訪問済み`
**色**: 青（primary）

**条件**:
- 営担（visitAssignee）に入力がある
- 訪問日（visitDate）が昨日以前

**表示例**:
- 訪問済み(Y)
- 訪問済み(I)

**サブステータス**: 訪問済みの売主が「当日TEL分」の条件も満たす場合、サブステータスとして表示

---

### 3. 「当日TEL分」

**サイドバー表示**: `③当日TEL分`
**色**: 赤（error）

**条件**:
- 状況（当社）に「追客中」が含まれる
- 次電日が今日以前
- **コミュニケーション情報（3つのフィールド）が全て空**
- **営担（visitAssignee）が空**

**コミュニケーション情報の3つのフィールド**:
1. `contact_method`（連絡方法）
2. `preferred_contact_time`（連絡取りやすい時間）
3. `phone_contact_person`（電話担当）

**重要**: 
- コミュニケーション情報のいずれかに入力がある売主は「当日TEL分」に**含まれない**
- **営担に入力がある売主は「当日TEL分」に含まれない** → 「当日TEL（担当）」に分類

---

### 3-2. 「当日TEL（担当）」

**サイドバー表示**: `当日TEL(Y)`、`当日TEL(I)` など
**色**: オレンジ（#ff5722）

**条件**:
- **営担（visitAssignee）に入力がある**（「外す」以外）
- **次電日が今日以前**

**表示例**:
- 当日TEL(Y)
- 当日TEL(I)

**重要**: 
- 訪問日の有無に関係なく、営担があり次電日が今日以前であれば対象
- イニシャル別にサイドバーに表示される
- **営担が「外す」の場合は担当なしと同じ扱い** → 「当日TEL分」に分類

---

### 4. 「当日TEL（内容）」

**サイドバー表示**: `④当日TEL（内容）`
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

### 5. 「未査定」

**サイドバー表示**: `⑤未査定`
**色**: オレンジ（warning）

**条件**:
- 査定額1, 2, 3が全て空欄（自動計算と手動入力の両方）
- 反響日付が2025/12/8以降
- 査定不要ではない
- 営担（visitAssignee）が空欄
- 状況（当社）に「追客中」が含まれる

---

### 6. 「査定（郵送）」

**サイドバー表示**: `⑥査定（郵送）`
**色**: 水色（info）

**条件**:
- 郵送ステータス（mailingStatus）が「未」

---

### 7. 「当日TEL_未着手」

**サイドバー表示**: `⑦当日TEL_未着手`
**色**: オレンジ（#ff9800）

**条件**:
- **不通カラム（unreachableStatus）が空欄**
- **反響日付が2026/1/1以降**
- 当日TEL分の条件を満たす（追客中 + 次電日が今日以前 + コミュニケーション情報が全て空 + 営担なし）

**重要**: 
- 当日TEL分のサブセット（当日TEL分の条件を満たす売主の中で、さらに不通が空欄かつ反響日付が2026/1/1以降の売主）
- 不通カラムに何か入力がある場合は対象外

---

### 8. 「Pinrich空欄」

**サイドバー表示**: `⑧Pinrich空欄`
**色**: ブラウン（#795548）

**条件**:
- **Pinrichカラム（pinrichStatus）が空欄**
- 当日TEL分の条件を満たす（追客中 + 次電日が今日以前 + コミュニケーション情報が全て空 + 営担なし）

**重要**: 
- 当日TEL分のサブセット（当日TEL分の条件を満たす売主の中で、さらにPinrichが空欄の売主）
- Pinrichカラムに何か入力がある場合は対象外

---

## 🔍 実装ファイル

### フィルタリングロジック

**ファイル**: `frontend/src/utils/sellerStatusFilters.ts`

**関数**:
- `isVisitScheduled()` - 訪問予定の判定
- `isVisitCompleted()` - 訪問済みの判定
- `getVisitStatusLabel()` - 訪問予定/訪問済みの表示ラベル取得
- `isTodayCall()` - 当日TEL分の判定
- `isTodayCallWithInfo()` - 当日TEL（内容）の判定
- `getTodayCallWithInfoLabel()` - 当日TEL（内容）の表示ラベル取得
- `isUnvaluated()` - 未査定の判定
- `isMailingPending()` - 査定（郵送）の判定
- `isTodayCallNotStarted()` - 当日TEL_未着手の判定
- `isPinrichEmpty()` - Pinrich空欄の判定

### ステータス表示ロジック

**ファイル**: `frontend/src/utils/sellerStatusUtils.ts`

**関数**:
- `calculateSellerStatus()` - 売主のステータスを計算（テーブルのステータス列用）

### サイドバーUI

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**カテゴリ型**: `StatusCategory`
- `'all'` - 全て
- `'visitScheduled'` - 訪問予定
- `'visitCompleted'` - 訪問済み
- `'todayCallAssigned'` - 当日TEL（担当）
- `'todayCall'` - 当日TEL分
- `'todayCallWithInfo'` - 当日TEL（内容）
- `'unvaluated'` - 未査定
- `'mailingPending'` - 査定（郵送）
- `'todayCallNotStarted'` - 当日TEL_未着手
- `'pinrichEmpty'` - Pinrich空欄

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
| 訪問予定 | 営担あり + 訪問日が今日以降 | 緑 |
| 訪問済み | 営担あり + 訪問日が昨日以前 | 青 |
| 当日TEL（担当） | **営担あり + 次電日が今日以前** | オレンジ |
| 当日TEL分 | 追客中 + 次電日が今日以前 + コミュニケーション情報が全て空 + **営担なし** | 赤 |
| 当日TEL（内容） | 追客中 + 次電日が今日以前 + コミュニケーション情報のいずれかに入力あり + **営担なし** | 紫 |
| 未査定 | 追客中 + 査定額が全て空（自動・手動両方） + 反響日付が2025/12/8以降 + 営担が空 + 査定不要ではない | オレンジ |
| 査定（郵送） | 郵送ステータスが「未」 | 青 |
| 当日TEL_未着手 | 当日TEL分の条件 + 不通が空欄 + 反響日付が2026/1/1以降 | オレンジ |
| Pinrich空欄 | 当日TEL分の条件 + Pinrichが空欄 | ブラウン |

**このルールを徹底することで、ステータスの混同を完全に防止できます。**

---

**最終更新日**: 2026年1月31日  
**作成理由**: サイドバーステータスの定義を明確化し、同じ間違いを繰り返さないため
**更新履歴**:
- 2026年1月31日: 「当日TEL_未着手」「Pinrich空欄」カテゴリを追加
- 2026年1月31日: 「当日TEL（担当）」カテゴリを追加（営担あり + 次電日が今日以前）
