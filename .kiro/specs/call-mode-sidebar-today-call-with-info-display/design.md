# 通話モードページ サイドバー「④当日TEL（内容）」ラベル表示問題 - 設計書

## 診断結果

### ✅ バックエンド: 正常に動作

**テスト結果** (`backend/test-sidebar-counts-api.ts`):
```
📊 todayCallWithInfoGroups: 6グループ
  当日TEL(メール を優先して希望): 2件
  当日TEL(メール): 2件
  当日TEL(電話、メール を優先して希望): 1件
  当日TEL(午前中): 1件
  当日TEL(夕方): 1件
  当日TEL(12時～13時): 1件

✅ AA9492のグループが見つかりました:
   ラベル: 当日TEL(メール を優先して希望)
   件数: 2
```

**結論**: バックエンドの`getSidebarCounts`メソッドは正しく`todayCallWithInfoGroups`を返している。

### ❓ フロントエンド: 問題箇所を特定中

**確認済み**:
1. ✅ `CallModePage.tsx`の型定義に`todayCallWithInfoGroups`が含まれている
2. ✅ `SellerStatusSidebar.tsx`で`group.label`を正しく表示している
3. ✅ `getTodayCallWithInfoLabel`関数は正しく実装されている

**未確認**:
1. ❓ APIレスポンスが正しくフロントエンドに届いているか
2. ❓ `setSidebarCounts(response.data)`で正しく状態が更新されているか
3. ❓ `todayCallWithInfoGroups`が`SellerStatusSidebar`に正しく渡されているか

## 問題の仮説

### 仮説1: APIレスポンスが正しく届いていない

**可能性**: 低（バックエンドは正しく動作している）

**確認方法**:
- ブラウザのネットワークタブで`/api/sellers/sidebar-counts`のレスポンスを確認
- `response.data.todayCallWithInfoGroups`の内容を確認

### 仮説2: 状態更新のタイミング問題

**可能性**: 中

**確認方法**:
- `fetchSidebarCounts`が正しく呼び出されているか確認
- `setSidebarCounts`の直後に`sidebarCounts`の値を確認

### 仮説3: `categoryCounts`が正しく渡されていない

**可能性**: 高

**確認方法**:
- `SellerStatusSidebar`に渡される`categoryCounts`の値を確認
- `categoryCounts.todayCallWithInfoGroups`が空配列になっていないか確認

## 設計方針

### 1. ログ出力の追加

**目的**: 問題箇所を特定するため

**追加箇所**:
1. `CallModePage.tsx`の`fetchSidebarCounts`
   - APIレスポンスの`todayCallWithInfoGroups`を詳細にログ出力
2. `SellerStatusSidebar.tsx`の`useMemo`
   - `categoryCounts.todayCallWithInfoGroups`の値をログ出力
   - `todayCallWithInfoGroups`の最終的な値をログ出力

### 2. 型定義の確認

**目的**: 型の不一致がないか確認

**確認箇所**:
1. `CallModePage.tsx`の`sidebarCounts`の型定義
2. `SellerStatusSidebar.tsx`の`categoryCounts`の型定義
3. APIレスポンスの型定義

### 3. デバッグ用のテンポラリコード追加

**目的**: 問題を迅速に特定

**追加内容**:
- `SellerStatusSidebar.tsx`で`todayCallWithInfoGroups`の内容を画面に表示
- `group.label`の値を直接確認

## 実装計画

### Phase 1: ログ出力の追加

#### Task 1.1: CallModePageにログ追加

**ファイル**: `frontend/src/pages/CallModePage.tsx`

**変更箇所**: `fetchSidebarCounts`メソッド

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

#### Task 1.2: SellerStatusSidebarにログ追加

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更箇所**: `todayCallWithInfoGroups`の`useMemo`

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

### Phase 2: デバッグ用の表示追加

#### Task 2.1: todayCallWithInfoGroupsの内容を画面に表示

**ファイル**: `frontend/src/components/SellerStatusSidebar.tsx`

**変更箇所**: レンダリング部分

**変更内容**:
```typescript
{/* デバッグ用: todayCallWithInfoGroupsの内容を表示 */}
{process.env.NODE_ENV === 'development' && (
  <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1, mb: 2 }}>
    <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
      🔍 Debug: todayCallWithInfoGroups
    </Typography>
    <pre style={{ fontSize: '10px', overflow: 'auto' }}>
      {JSON.stringify(todayCallWithInfoGroups, null, 2)}
    </pre>
  </Box>
)}
```

### Phase 3: 問題の修正

**問題箇所が特定された後に実施**

#### Case A: APIレスポンスが正しく届いていない場合

**対応**: バックエンドのルーティングまたはAPIクライアントを確認

#### Case B: 状態更新のタイミング問題の場合

**対応**: `useEffect`の依存配列を確認、必要に応じて修正

#### Case C: `categoryCounts`が正しく渡されていない場合

**対応**: `CallModePage.tsx`から`SellerStatusSidebar`へのprops渡しを確認

## テスト計画

### Test 1: ログ出力の確認

**手順**:
1. フロントエンドを起動
2. 通話モードページを開く
3. ブラウザのコンソールを開く
4. ログ出力を確認

**期待される結果**:
- `📊 サイドバーカウント取得開始...`
- `✅ サイドバーカウント取得完了:`
- `🔍 todayCallWithInfoGroups:` に6グループが表示される
- `🔍 SellerStatusSidebar - categoryCounts.todayCallWithInfoGroups:` に6グループが表示される
- `✅ APIから取得したtodayCallWithInfoGroupsを使用:` に6グループが表示される

### Test 2: デバッグ表示の確認

**手順**:
1. 通話モードページを開く
2. サイドバーのデバッグ表示を確認

**期待される結果**:
- デバッグ表示に6グループが表示される
- 各グループの`label`が具体的な内容を含む

### Test 3: 実際の表示の確認

**手順**:
1. 通話モードページを開く
2. サイドバーの「④当日TEL（内容）」セクションを確認

**期待される結果**:
- 「当日TEL(メール を優先して希望)」のように具体的な内容が表示される
- 「（内容）」のみの表示にならない

## リスク管理

### リスク1: ログ出力が多すぎてパフォーマンスに影響

**対策**: 開発環境のみでログ出力を有効にする

### リスク2: デバッグ表示が本番環境に残る

**対策**: `process.env.NODE_ENV === 'development'`で条件分岐

### リスク3: 問題が複数箇所にある

**対策**: Phase 1のログ出力で全ての箇所を確認

## 成功基準

### 定量的基準

1. **ログ出力**:
   - `todayCallWithInfoGroups`に6グループが表示される
   - 各グループの`label`が空文字列でない

2. **画面表示**:
   - サイドバーに6つのボタンが表示される
   - 各ボタンのラベルが具体的な内容を含む

### 定性的基準

1. **ユーザビリティ**:
   - ユーザーが一目で連絡方法を確認できる
   - 売主リストページと同じ表示形式

2. **保守性**:
   - ログ出力により問題箇所を迅速に特定できる
   - デバッグ表示により開発者が問題を確認できる

## 次のステップ

1. ✅ 設計書を作成（このドキュメント）
2. ⏳ タスクリスト（tasks.md）を作成
3. ⏳ Phase 1: ログ出力の追加を実装
4. ⏳ ログ出力を確認して問題箇所を特定
5. ⏳ Phase 2: デバッグ用の表示追加を実装（必要な場合）
6. ⏳ Phase 3: 問題の修正を実装
7. ⏳ テスト実行
8. ⏳ コミット＆プッシュ

## 参考資料

- `.kiro/specs/call-mode-sidebar-today-call-with-info-display/requirements.md` - 要件定義書
- `.kiro/steering/sidebar-api-response-validation.md` - サイドバーAPIレスポンス検証ルール
- `.kiro/steering/sidebar-status-definition.md` - サイドバーステータス定義
- `backend/test-sidebar-counts-api.ts` - バックエンドテストスクリプト

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Draft（タスクリスト作成待ち）
