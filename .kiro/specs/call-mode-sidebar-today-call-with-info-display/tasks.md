# 通話モードページ サイドバー「④当日TEL（内容）」ラベル表示問題 - タスクリスト

## 概要

通話モードページのサイドバーで「④当日TEL（内容）」カテゴリのラベルが「（内容）」のみ表示される問題を修正します。

**診断結果**: バックエンドは正常に動作しているため、フロントエンドの問題と判断。

## タスク一覧

### Phase 1: ログ出力の追加（診断）

- [ ] 1.1 CallModePageにログ出力を追加
- [ ] 1.2 SellerStatusSidebarにログ出力を追加
- [ ] 1.3 ログ出力を確認して問題箇所を特定

### Phase 2: デバッグ用の表示追加（必要な場合のみ）

- [ ] 2.1 SellerStatusSidebarにデバッグ表示を追加
- [ ] 2.2 デバッグ表示を確認

### Phase 3: 問題の修正

- [ ] 3.1 問題箇所を修正
- [ ] 3.2 修正内容をテスト

### Phase 4: クリーンアップ

- [ ] 4.1 デバッグ用のログ出力を削除（または開発環境のみに制限）
- [ ] 4.2 デバッグ用の表示を削除
- [ ] 4.3 コミット＆プッシュ

---

## 詳細タスク

### Task 1.1: CallModePageにログ出力を追加

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更箇所**: `fetchSidebarCounts`メソッド（約780-810行目）

**変更内容**:
```typescript
const fetchSidebarCounts = useCallback(async () => {
  try {
    console.log('📊 サイドバーカウント取得開始...');
    const response = await api.get('/api/sellers/sidebar-counts');
    console.log('✅ サイドバーカウント取得完了:', response.data);
    
    // 🔍 todayCallWithInfoGroupsの詳細ログ
    console.log('🔍 todayCallWithInfoGroups:', response.data.todayCallWithInfoGroups);
    if (response.data.todayCallWithInfoGroups) {
      console.log('🔍 todayCallWithInfoGroups.length:', response.data.todayCallWithInfoGroups.length);
      response.data.todayCallWithInfoGroups.forEach((group: any, index: number) => {
        console.log(`🔍 Group ${index + 1}:`, {
          label: group.label,
          count: group.count,
        });
      });
    }
    
    setSidebarCounts(response.data);
  } catch (error) {
    console.error('❌ サイドバーカウント取得エラー:', error);
    // エラー時はカウントを0にリセット
    setSidebarCounts({
      todayCall: 0,
      todayCallWithInfo: 0,
      todayCallAssigned: 0,
      visitScheduled: 0,
      visitCompleted: 0,
      unvaluated: 0,
      mailingPending: 0,
      todayCallNotStarted: 0,
      pinrichEmpty: 0,
      visitScheduledByAssignee: [],
      visitCompletedByAssignee: [],
      todayCallWithInfoGroups: [],
    });
  }
}, []);
```

**Acceptance Criteria**:
- [ ] ログ出力が追加されている
- [ ] `todayCallWithInfoGroups`の内容が詳細に出力される
- [ ] 各グループの`label`と`count`が出力される

---

### Task 1.2: SellerStatusSidebarにログ出力を追加

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更箇所**: `todayCallWithInfoGroups`の`useMemo`（約304-312行目）

**変更内容**:
```typescript
const todayCallWithInfoGroups = useMemo(() => {
  console.log('🔍 SellerStatusSidebar - categoryCounts:', categoryCounts);
  console.log('🔍 SellerStatusSidebar - categoryCounts.todayCallWithInfoGroups:', categoryCounts?.todayCallWithInfoGroups);
  
  // APIから取得したグループ化データがある場合はそれを使用
  if (categoryCounts?.todayCallWithInfoGroups && categoryCounts.todayCallWithInfoGroups.length > 0) {
    console.log('✅ APIから取得したtodayCallWithInfoGroupsを使用:', categoryCounts.todayCallWithInfoGroups);
    return categoryCounts.todayCallWithInfoGroups;
  }
  
  // なければvalidSellersから計算（後方互換性のため）
  console.log('⚠️ validSellersから計算したtodayCallWithInfoGroupsを使用');
  const computed = groupTodayCallWithInfo(validSellers);
  console.log('🔍 計算結果:', computed);
  return computed;
}, [categoryCounts?.todayCallWithInfoGroups, validSellers]);
```

**Acceptance Criteria**:
- [ ] ログ出力が追加されている
- [ ] `categoryCounts.todayCallWithInfoGroups`の内容が出力される
- [ ] APIから取得したデータを使用しているか、計算したデータを使用しているかが分かる

---

### Task 1.3: ログ出力を確認して問題箇所を特定

**手順**:
1. フロントエンドを起動
2. 通話モードページを開く
3. ブラウザのコンソールを開く
4. ログ出力を確認

**確認項目**:
- [ ] `📊 サイドバーカウント取得開始...`が出力される
- [ ] `✅ サイドバーカウント取得完了:`が出力される
- [ ] `🔍 todayCallWithInfoGroups:`に6グループが表示される
- [ ] 各グループの`label`が具体的な内容を含む（例：「当日TEL(メール を優先して希望)」）
- [ ] `🔍 SellerStatusSidebar - categoryCounts.todayCallWithInfoGroups:`に6グループが表示される
- [ ] `✅ APIから取得したtodayCallWithInfoGroupsを使用:`が出力される

**問題箇所の特定**:
- [ ] APIレスポンスに`todayCallWithInfoGroups`が含まれているか？
- [ ] `categoryCounts.todayCallWithInfoGroups`が正しく渡されているか？
- [ ] `todayCallWithInfoGroups`の最終的な値が正しいか？

---

### Task 2.1: SellerStatusSidebarにデバッグ表示を追加（必要な場合のみ）

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更箇所**: レンダリング部分（約695行目の前）

**変更内容**:
```typescript
{/* デバッグ用: todayCallWithInfoGroupsの内容を表示 */}
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
      🔍 Debug: todayCallWithInfoGroups
    </Typography>
    <pre style={{ fontSize: '10px', overflow: 'auto', maxHeight: '200px' }}>
      {JSON.stringify(todayCallWithInfoGroups, null, 2)}
    </pre>
  </Box>
)}
```

**Acceptance Criteria**:
- [ ] デバッグ表示が追加されている
- [ ] 開発環境のみで表示される
- [ ] `todayCallWithInfoGroups`の内容が表示される

---

### Task 2.2: デバッグ表示を確認

**手順**:
1. 通話モードページを開く
2. サイドバーのデバッグ表示を確認

**確認項目**:
- [ ] デバッグ表示に6グループが表示される
- [ ] 各グループの`label`が具体的な内容を含む
- [ ] 各グループの`count`が正しい

---

### Task 3.1: 問題箇所を修正

**問題箇所が特定された後に実施**

#### Case A: APIレスポンスが正しく届いていない場合

**対応**: バックエンドのルーティングまたはAPIクライアントを確認

**ファイル**: 
- `backend/src/routes/sellers.ts`
- `frontend/src/services/api.ts`

#### Case B: 状態更新のタイミング問題の場合

**対応**: `useEffect`の依存配列を確認、必要に応じて修正

**ファイル**: `frontend/src/pages/CallModePage.tsx`

#### Case C: `categoryCounts`が正しく渡されていない場合

**対応**: `CallModePage.tsx`から`SellerStatusSidebar`へのprops渡しを確認

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**Acceptance Criteria**:
- [ ] 問題箇所が修正されている
- [ ] 修正内容が明確に記録されている

---

### Task 3.2: 修正内容をテスト

**手順**:
1. フロントエンドを再起動
2. 通話モードページを開く
3. サイドバーの「④当日TEL（内容）」セクションを確認

**確認項目**:
- [ ] 「当日TEL(メール を優先して希望)」のように具体的な内容が表示される
- [ ] 「（内容）」のみの表示にならない
- [ ] AA9492が「当日TEL(メール を優先して希望)」として表示される
- [ ] 6つのグループが表示される
- [ ] 各グループの件数が正しい

---

### Task 4.1: デバッグ用のログ出力を削除（または開発環境のみに制限）

**ファイル**: 
- `frontend/src/pages/CallModePage.tsx`
- `frontend/src/components/SellerStatusSidebar.tsx`

**変更内容**:
- 詳細なログ出力を削除
- または`if (process.env.NODE_ENV === 'development')`で条件分岐

**Acceptance Criteria**:
- [ ] 本番環境で不要なログが出力されない
- [ ] 開発環境では診断用のログが出力される

---

### Task 4.2: デバッグ用の表示を削除

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更内容**:
- デバッグ表示のコードを削除
- または`process.env.NODE_ENV === 'development'`の条件を維持

**Acceptance Criteria**:
- [ ] 本番環境でデバッグ表示が表示されない
- [ ] 開発環境では必要に応じてデバッグ表示が表示される

---

### Task 4.3: コミット＆プッシュ

**手順**:
1. 変更内容を確認
2. コミットメッセージを作成
3. コミット
4. プッシュ

**コミットメッセージ例**:
```
Fix: 通話モードページのサイドバー「④当日TEL（内容）」ラベル表示問題を修正

問題:
- サイドバーで「④当日TEL（内容）」のラベルが「（内容）」のみ表示される
- 具体的な内容（例：「メール を優先して希望」）が表示されない

原因:
- [問題箇所を記載]

修正内容:
- [修正内容を記載]

テスト:
- ✅ バックエンドのテストスクリプトで確認
- ✅ 通話モードページで動作確認
- ✅ 売主リストページで動作確認（影響なし）

関連:
- Spec: .kiro/specs/call-mode-sidebar-today-call-with-info-display/
- Issue: AA9492 サイドバーカテゴリ表示問題
```

**Acceptance Criteria**:
- [ ] コミットメッセージが明確
- [ ] 変更内容が記録されている
- [ ] プッシュが完了している

---

## 進捗管理

### 現在のステータス

- [x] 要件定義書作成
- [x] 設計書作成
- [x] タスクリスト作成
- [ ] Phase 1: ログ出力の追加
- [ ] Phase 2: デバッグ用の表示追加
- [ ] Phase 3: 問題の修正
- [ ] Phase 4: クリーンアップ

### 次のアクション

1. Task 1.1: CallModePageにログ出力を追加
2. Task 1.2: SellerStatusSidebarにログ出力を追加
3. Task 1.3: ログ出力を確認して問題箇所を特定

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Ready（実装開始可能）
