# サイドバーから通話モードページへの遷移機能 - 設計書

## 概要

売主リストの通話モードページのサイドバーで、各ステータスカテゴリのボタンをクリックした際に、そのカテゴリの最初の売主の通話モードページに直接遷移できるようにする機能の設計書です。

---

## 問題の特定

### 現在の実装

```typescript
// frontend/src/components/SellerStatusSidebar.tsx
const handleCategoryClick = (category: StatusCategory) => {
  if (expandedCategory === category) {
    setExpandedCategory(null);
  } else {
    setExpandedCategory(category);
  }
  
  // 売主リストページの場合のみカテゴリを選択
  if (!isCallMode) {
    onCategorySelect?.(category);
  }
  // ← 通話モードページの場合は何もしない（問題箇所）
};
```

**問題**: `isCallMode = true`の場合、カテゴリを展開するだけで、その後の処理がない

### 期待される動作

**通話モードページ**:
- カテゴリをクリック → そのカテゴリの最初の売主の通話モードページに遷移

**売主リストページ**:
- カテゴリをクリック → メインテーブルがフィルタリングされる（現在の動作を維持）

---

## アーキテクチャ

### コンポーネント構成

```
SellerStatusSidebar (既存)
  ├─ カテゴリボタン（クリックで最初の売主に遷移）← 修正が必要
  ├─ 訪問予定/訪問済みボタン（イニシャル別、クリックで最初の売主に遷移）← 修正が必要
  └─ 当日TEL（内容）ボタン（グループ別、クリックで最初の売主に遷移）← 修正が必要
```

### データフロー

```
1. ユーザーがカテゴリをクリック
   ↓
2. handleCategoryClick(category)が呼ばれる
   ↓
3. isCallMode = true の場合
   ↓
4. filterSellersByCategory(sellers, category)で売主リストをフィルタリング
   ↓
5. 最初の売主を取得
   ↓
6. navigate(`/sellers/${firstSeller.id}/call`)で遷移
   ↓
7. 新しい売主の通話モードページが表示される
   ↓
8. サイドバーの新しい売主のカテゴリがハイライトされる
```

---

## 実装設計

### 1. handleCategoryClick関数の修正

```typescript
// frontend/src/components/SellerStatusSidebar.tsx
const handleCategoryClick = (category: StatusCategory) => {
  if (isCallMode) {
    // 通話モードページの場合、最初の売主の通話モードページに遷移
    const filteredSellers = filterSellersByCategory(sellers, category);
    if (filteredSellers.length > 0) {
      const firstSeller = filteredSellers[0];
      navigate(`/sellers/${firstSeller.id}/call`);
    } else {
      // 該当する売主がいない場合はエラーメッセージを表示
      console.warn(`カテゴリ「${getCategoryLabel(category)}」に該当する売主がいません`);
    }
  } else {
    // 売主リストページの場合、カテゴリを選択（現在の動作を維持）
    if (expandedCategory === category) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(category);
    }
    onCategorySelect?.(category);
  }
};
```

**変更点**:
- `isCallMode = true`の場合、最初の売主の通話モードページに遷移
- 該当する売主がいない場合は、エラーメッセージを表示
- 売主リストページの動作は変更しない

---

### 2. 訪問予定/訪問済みのイニシャル別ボタンのクリック処理

```typescript
// frontend/src/components/SellerStatusSidebar.tsx
const renderVisitCategoryButtons = (
  category: 'visitScheduled' | 'visitCompleted',
  prefix: string,
  color: string
) => {
  // ... 既存のコード ...
  
  return (
    <Box key={category}>
      {byAssigneeData.map(({ initial, count }) => {
        // ... 既存のコード ...
        
        return (
          <Box key={visitKey}>
            <Button
              fullWidth
              onClick={() => {
                if (isCallMode) {
                  // 通話モードページの場合、最初の売主の通話モードページに遷移
                  const filterFn = category === 'visitScheduled' ? isVisitScheduled : isVisitCompleted;
                  const visitData = getVisitDataByAssignee(sellers, filterFn);
                  const targetData = visitData.find(d => d.initial === initial);
                  if (targetData && targetData.sellers.length > 0) {
                    const firstSeller = targetData.sellers[0];
                    navigate(`/sellers/${firstSeller.id}/call`);
                  } else {
                    console.warn(`${prefix}(${initial})に該当する売主がいません`);
                  }
                } else {
                  // 売主リストページの場合、カテゴリとイニシャルを選択（現在の動作を維持）
                  if (isSelected) {
                    onCategorySelect?.('all', undefined);
                  } else {
                    setExpandedCategory(null);
                    onCategorySelect?.(category, initial);
                  }
                }
              }}
              sx={{ /* ... */ }}
            >
              {/* ... */}
            </Button>
          </Box>
        );
      })}
    </Box>
  );
};
```

**変更点**:
- `isCallMode = true`の場合、最初の売主の通話モードページに遷移
- 該当する売主がいない場合は、エラーメッセージを表示
- 売主リストページの動作は変更しない

---

### 3. 当日TEL（内容）のグループ別ボタンのクリック処理

```typescript
// frontend/src/components/SellerStatusSidebar.tsx
const renderAllCategories = () => {
  // ... 既存のコード ...
  
  return (
    <Box sx={{ /* ... */ }}>
      {/* ... */}
      
      {/* ④当日TEL（内容）- 内容別にグループ化 */}
      {(() => {
        if (todayCallWithInfoGroups.length === 0) return null;
        
        return (
          <Box key="todayCallWithInfo">
            {todayCallWithInfoGroups.map((group) => {
              // ... 既存のコード ...
              
              return (
                <Button
                  key={group.label}
                  fullWidth
                  onClick={() => {
                    if (isCallMode) {
                      // 通話モードページの場合、最初の売主の通話モードページに遷移
                      if (group.sellers.length > 0) {
                        const firstSeller = group.sellers[0];
                        navigate(`/sellers/${firstSeller.id}/call`);
                      } else {
                        console.warn(`${group.label}に該当する売主がいません`);
                      }
                    } else {
                      // 売主リストページの場合、カテゴリとグループを選択（現在の動作を維持）
                      if (isSelected) {
                        onCategorySelect?.('all', undefined);
                      } else {
                        setExpandedCategory(null);
                        onCategorySelect?.('todayCallWithInfo', group.label);
                      }
                    }
                  }}
                  sx={{ /* ... */ }}
                >
                  {/* ... */}
                </Button>
              );
            })}
          </Box>
        );
      })()}
      
      {/* ... */}
    </Box>
  );
};
```

**変更点**:
- `isCallMode = true`の場合、最初の売主の通話モードページに遷移
- 該当する売主がいない場合は、エラーメッセージを表示
- 売主リストページの動作は変更しない

---

## 正解性プロパティ（Property-Based Testing）

### プロパティ1: カテゴリクリック時の遷移

**プロパティ**: 通話モードページでカテゴリをクリックすると、該当する売主リストの最初の売主の通話モードページに遷移する

**検証方法**:
```typescript
// 任意のカテゴリに対して
forAll(category: StatusCategory, sellers: Seller[]) => {
  const filteredSellers = filterSellersByCategory(sellers, category);
  if (filteredSellers.length > 0) {
    const firstSeller = filteredSellers[0];
    handleCategoryClick(category);
    // 期待: navigate(`/sellers/${firstSeller.id}/call`)が呼ばれる
  }
}
```

### プロパティ2: 訪問予定/訪問済みのイニシャル別ボタンクリック時の遷移

**プロパティ**: 通話モードページで訪問予定/訪問済みのイニシャル別ボタンをクリックすると、該当する売主リストの最初の売主の通話モードページに遷移する

**検証方法**:
```typescript
// 任意のイニシャルに対して
forAll(initial: string, sellers: Seller[]) => {
  const visitData = getVisitDataByAssignee(sellers, isVisitScheduled);
  const targetData = visitData.find(d => d.initial === initial);
  if (targetData && targetData.sellers.length > 0) {
    const firstSeller = targetData.sellers[0];
    // イニシャル別ボタンをクリック
    // 期待: navigate(`/sellers/${firstSeller.id}/call`)が呼ばれる
  }
}
```

### プロパティ3: 当日TEL（内容）のグループ別ボタンクリック時の遷移

**プロパティ**: 通話モードページで当日TEL（内容）のグループ別ボタンをクリックすると、該当する売主リストの最初の売主の通話モードページに遷移する

**検証方法**:
```typescript
// 任意のグループに対して
forAll(group: TodayCallWithInfoGroup, sellers: Seller[]) => {
  if (group.sellers.length > 0) {
    const firstSeller = group.sellers[0];
    // グループ別ボタンをクリック
    // 期待: navigate(`/sellers/${firstSeller.id}/call`)が呼ばれる
  }
}
```

### プロパティ4: 売主リストページの動作は変更されない

**プロパティ**: 売主リストページでカテゴリをクリックすると、メインテーブルがフィルタリングされる（現在の動作を維持）

**検証方法**:
```typescript
// isCallMode = false の場合
forAll(category: StatusCategory) => {
  handleCategoryClick(category);
  // 期待: onCategorySelect(category)が呼ばれる
  // 期待: navigateは呼ばれない
}
```

---

## 実装タスク

### タスク1: handleCategoryClick関数の修正

**目的**: 通話モードページでカテゴリをクリックすると、最初の売主の通話モードページに遷移する

**実装内容**:
1. `isCallMode = true`の場合、最初の売主の通話モードページに遷移
2. 該当する売主がいない場合は、エラーメッセージを表示
3. 売主リストページの動作は変更しない

---

### タスク2: 訪問予定/訪問済みのイニシャル別ボタンのクリック処理を修正

**目的**: 通話モードページでイニシャル別ボタンをクリックすると、最初の売主の通話モードページに遷移する

**実装内容**:
1. `renderVisitCategoryButtons`関数内のボタンクリック処理を修正
2. `isCallMode = true`の場合、最初の売主の通話モードページに遷移
3. 該当する売主がいない場合は、エラーメッセージを表示
4. 売主リストページの動作は変更しない

---

### タスク3: 当日TEL（内容）のグループ別ボタンのクリック処理を修正

**目的**: 通話モードページでグループ別ボタンをクリックすると、最初の売主の通話モードページに遷移する

**実装内容**:
1. `renderAllCategories`関数内のボタンクリック処理を修正
2. `isCallMode = true`の場合、最初の売主の通話モードページに遷移
3. 該当する売主がいない場合は、エラーメッセージを表示
4. 売主リストページの動作は変更しない

---

### タスク4: テスト

**実装内容**:
1. 単体テスト: `handleCategoryClick`関数のテスト
2. 統合テスト: 通話モードページでカテゴリをクリック → 最初の売主の通話モードページに遷移
3. E2Eテスト: サイドバーを操作して、売主の通話モードページに遷移できることを確認

---

### タスク5: ドキュメント更新

**実装内容**:
1. コードコメントを追加
2. ユーザーマニュアルを更新（必要な場合）

---

## まとめ

### 問題

**通話モードページでサイドバーのボタンを押しても無反応**

### 原因

`handleCategoryClick`関数で、`isCallMode = true`の場合の処理が実装されていない

### 解決策

1. `handleCategoryClick`関数を修正して、通話モードページでカテゴリをクリックすると、最初の売主の通話モードページに遷移するようにする
2. 訪問予定/訪問済みのイニシャル別ボタンのクリック処理を修正
3. 当日TEL（内容）のグループ別ボタンのクリック処理を修正

### 実装の優先順位

1. **P0**: handleCategoryClick関数の修正
2. **P1**: 訪問予定/訪問済みのイニシャル別ボタンのクリック処理を修正
3. **P1**: 当日TEL（内容）のグループ別ボタンのクリック処理を修正

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**ステータス**: 実装準備完了
