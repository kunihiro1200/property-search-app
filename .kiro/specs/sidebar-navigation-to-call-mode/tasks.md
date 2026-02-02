# サイドバーから通話モードページへの遷移機能 - タスクリスト

## 概要

売主リストの通話モードページのサイドバーで、各ステータスカテゴリのボタンをクリックした際に、そのカテゴリの最初の売主の通話モードページに直接遷移できるようにする機能の実装タスクリストです。

---

## 問題の確認

### 現在の状況

**通話モードページでサイドバーのボタンを押しても無反応**

### 原因

`handleCategoryClick`関数で、`isCallMode = true`の場合の処理が実装されていない

```typescript
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

---

## タスク

### フェーズ1: handleCategoryClick関数の修正

- [ ] 1.1 `handleCategoryClick`関数を修正
  - 通話モードページの場合、最初の売主の通話モードページに遷移
  - 売主リストページの場合、現在の動作を維持（カテゴリを選択）
  - 該当する売主がいない場合、エラーメッセージを表示

**実装内容**:
```typescript
const handleCategoryClick = (category: StatusCategory) => {
  if (isCallMode) {
    // 通話モードページの場合、最初の売主の通話モードページに遷移
    const filteredSellers = filterSellersByCategory(sellers, category);
    if (filteredSellers.length > 0) {
      const firstSeller = filteredSellers[0];
      navigate(`/sellers/${firstSeller.id}/call`);
    } else {
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

---

### フェーズ2: 訪問予定/訪問済みのイニシャル別ボタンのクリック処理を修正

- [ ] 2.1 `renderVisitCategoryButtons`関数内のボタンクリック処理を修正
  - 通話モードページの場合、最初の売主の通話モードページに遷移
  - 売主リストページの場合、現在の動作を維持（カテゴリとイニシャルを選択）
  - 該当する売主がいない場合、エラーメッセージを表示

**実装内容**:
```typescript
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
```

---

### フェーズ3: 当日TEL（内容）のグループ別ボタンのクリック処理を修正

- [ ] 3.1 `renderAllCategories`関数内のボタンクリック処理を修正
  - 通話モードページの場合、最初の売主の通話モードページに遷移
  - 売主リストページの場合、現在の動作を維持（カテゴリとグループを選択）
  - 該当する売主がいない場合、エラーメッセージを表示

**実装内容**:
```typescript
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
```

---

### フェーズ4: テスト

- [ ] 4.1 単体テスト
  - `handleCategoryClick`関数のテスト
  - 通話モードページでカテゴリをクリック → 最初の売主の通話モードページに遷移
  - 売主リストページでカテゴリをクリック → メインテーブルがフィルタリングされる

- [ ] 4.2 統合テスト
  - 通話モードページでカテゴリをクリック → 最初の売主の通話モードページに遷移
  - 訪問予定/訪問済みのイニシャル別ボタンをクリック → 最初の売主の通話モードページに遷移
  - 当日TEL（内容）のグループ別ボタンをクリック → 最初の売主の通話モードページに遷移

- [ ] 4.3 E2Eテスト
  - 通話モードページでサイドバーを操作して、売主の通話モードページに遷移できることを確認
  - 売主リストページでサイドバーを操作して、メインテーブルがフィルタリングされることを確認

---

### フェーズ5: ドキュメント更新

- [ ] 5.1 コードコメントを追加
  - `handleCategoryClick`関数
  - `renderVisitCategoryButtons`関数
  - `renderAllCategories`関数

- [ ] 5.2 ユーザーマニュアルを更新（必要な場合）

---

## 完了条件

- [ ] 通話モードページでカテゴリをクリックすると、そのカテゴリの最初の売主の通話モードページに遷移する
- [ ] 訪問予定/訪問済みのイニシャル別ボタンをクリックすると、そのイニシャルの最初の売主の通話モードページに遷移する
- [ ] 当日TEL（内容）のグループ別ボタンをクリックすると、そのグループの最初の売主の通話モードページに遷移する
- [ ] 該当する売主がいない場合は、エラーメッセージが表示される
- [ ] 売主リストページの動作は変更されない（メインテーブルのフィルタリング）
- [ ] テストが全て通過する
- [ ] ドキュメントが更新されている

---

## 注意事項

### 既存機能への影響

- 売主リストページの動作は変更しない（現在の動作を維持）
- 通話モードページのみ新しい動作を実装する

### パフォーマンス

- 売主リストの取得は既存のpropsを使用する
- 追加のAPIリクエストは不要

---

**作成日**: 2026年2月2日  
**作成者**: Kiro AI  
**ステータス**: 実装準備完了
