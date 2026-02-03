# 通話モードページ サイドバー「④当日TEL（内容）」ラベル表示問題 - 要件定義

## 問題の概要

通話モードページのサイドバーで「④当日TEL（内容）」カテゴリのラベルが全て「（内容）」と表示され、具体的な内容（例：「メール を優先して希望」）が表示されない。

## 背景

### 期待される動作

売主リストページでは、「④当日TEL（内容）」カテゴリが以下のように具体的な内容別にグループ化されて表示される：

- 当日TEL(メール を優先して希望) - 2件
- 当日TEL(午前中) - 3件
- 当日TEL(Y) - 1件

### 現在の動作

通話モードページでは、全て「（内容）」とだけ表示され、具体的な内容が表示されない。

### 影響範囲

- **影響を受けるページ**: 通話モードページ (`/sellers/:id/call`)
- **影響を受けないページ**: 売主リストページ (`/sellers`) - 正常に動作している

## 関連情報

### 関連Issue/Task

- 親タスク: AA9492 サイドバーカテゴリ表示問題の修正
- 関連コミット: `86a8a0d` (売主サイドバー「当日TEL（内容）」を内容別にグループ化表示)

### 関連ファイル

**バックエンド**:
- `backend/src/services/SellerService.supabase.ts` (1434-1700行目)
  - `getSidebarCounts`メソッド
  - `groupTodayCallWithInfo`メソッド

**フロントエンド**:
- `frontend/src/pages/CallModePage.tsx`
  - サイドバーカウントの取得と状態管理
- `frontend/src/components/SellerStatusSidebar.tsx`
  - サイドバーのレンダリング

**ステアリングドキュメント**:
- `.kiro/steering/sidebar-api-response-validation.md`
- `.kiro/steering/sidebar-status-definition.md`

## User Stories

### US-1: 通話モードページで「④当日TEL（内容）」の具体的な内容を表示

**As a** ユーザー  
**I want to** 通話モードページのサイドバーで「④当日TEL（内容）」の具体的な内容（例：「メール を優先して希望」）を見たい  
**So that** どの売主にどのような方法で連絡すべきかが一目で分かる

**Acceptance Criteria**:
1. サイドバーに「当日TEL(メール を優先して希望)」のように具体的な内容が表示される
2. 「（内容）」のみの表示にならない
3. 売主リストページと同じ表示形式になる
4. ハードリロード後も正しく表示される
5. AA9492が「当日TEL(メール を優先して希望)」として表示される

### US-2: サイドバーカウントAPIが正しいデータを返す

**As a** 開発者  
**I want to** サイドバーカウントAPIが`todayCallWithInfoGroups`を正しく返す  
**So that** フロントエンドで具体的な内容を表示できる

**Acceptance Criteria**:
1. `/api/sellers/sidebar-counts`が`todayCallWithInfoGroups`フィールドを含む
2. `todayCallWithInfoGroups`が空配列でない（該当する売主がいる場合）
3. 各グループの`label`が具体的な内容を含む（例：「当日TEL(メール を優先して希望)」）
4. 各グループの`count`が正しい件数を示す
5. バックエンドコンソールにログが出力される

## 機能要件

### FR-1: バックエンド - サイドバーカウントAPI

**要件**:
1. `getSidebarCounts`メソッドが`todayCallWithInfoGroups`を返す
2. グループ化ロジックが以下の優先順位でラベルを生成する：
   - 連絡方法（`contact_method`）
   - 連絡取りやすい時間（`preferred_contact_time`）
   - 電話担当（`phone_contact_person`）
3. ラベルが空文字列にならない
4. ログ出力で診断可能にする

**実装箇所**:
- `backend/src/services/SellerService.supabase.ts`
  - `getSidebarCounts`メソッド（1560-1580行目付近）
  - `groupTodayCallWithInfo`メソッド

### FR-2: フロントエンド - CallModePage

**要件**:
1. `sidebarCounts`の型定義に`todayCallWithInfoGroups: { label: string; count: number }[]`を含む
2. APIから取得した`todayCallWithInfoGroups`を`SellerStatusSidebar`に渡す
3. エラー時に`todayCallWithInfoGroups: []`でリセットする
4. 重複定義がない

**実装箇所**:
- `frontend/src/pages/CallModePage.tsx`

### FR-3: フロントエンド - SellerStatusSidebar

**要件**:
1. `todayCallWithInfoGroups`を受け取る
2. 各グループの`label`を正しく表示する
3. `group.sellers`がundefinedの場合は`validSellers`から検索する
4. ラベルが空の場合は「（内容）」と表示しない

**実装箇所**:
- `frontend/src/components/SellerStatusSidebar.tsx`

## 非機能要件

### NFR-1: パフォーマンス

- サイドバーカウントAPIのレスポンス時間: 500ms以内
- グループ化処理の実行時間: 100ms以内

### NFR-2: 保守性

- ログ出力により診断可能
- ステアリングドキュメントに従った実装
- 型定義が明確

### NFR-3: 互換性

- 売主リストページの動作に影響を与えない
- 既存のサイドバーカテゴリの動作に影響を与えない

## 制約条件

### 技術的制約

1. **システム隔離ルール**を遵守する
   - 売主管理システム（`backend/src/`）のみを修正
   - 公開物件サイト（`backend/api/`）は触らない

2. **ステアリングドキュメント**に従う
   - `.kiro/steering/sidebar-api-response-validation.md`
   - `.kiro/steering/sidebar-status-definition.md`

3. **既存の動作を維持する**
   - 売主リストページのサイドバー表示は変更しない
   - 他のサイドバーカテゴリの動作は変更しない

### ビジネス制約

1. **緊急度**: 高（ユーザーが通話モードページで具体的な連絡方法を確認できない）
2. **影響範囲**: 通話モードページのみ
3. **リリース**: 修正後すぐにデプロイ可能

## 診断手順

### Step 1: APIレスポンスの確認

ブラウザコンソールで以下のコードを実行して、`todayCallWithInfoGroups`の内容を確認：

```javascript
fetch('http://localhost:3000/api/sellers/sidebar-counts', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('supabase.auth.token') ? JSON.parse(localStorage.getItem('supabase.auth.token')).currentSession.access_token : ''}`,
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => {
  console.log('=== サイドバーカウントAPIレスポンス ===');
  console.log('todayCallWithInfo:', data.todayCallWithInfo);
  console.log('todayCallWithInfoGroups:', data.todayCallWithInfoGroups);
  console.log('全レスポンス:', data);
})
.catch(err => console.error('エラー:', err));
```

### Step 2: 結果に基づく対応

#### Case A: `todayCallWithInfoGroups`が空配列`[]`の場合

**問題箇所**: バックエンドのグループ化ロジック

**確認事項**:
1. バックエンドコンソールログを確認
   - `📊 todayCallWithInfoSellers: X件`
   - 各売主のラベルが正しく生成されているか
2. `todayCallWithInfoSellers`が空でないか
3. コミュニケーション情報が正しく取得できているか
   - `contact_method`
   - `preferred_contact_time`
   - `phone_contact_person`

**修正箇所**:
- `backend/src/services/SellerService.supabase.ts`の`getSidebarCounts`メソッド

#### Case B: `todayCallWithInfoGroups`に要素がある場合

**問題箇所**: フロントエンドのレンダリングロジック

**確認事項**:
1. `CallModePage.tsx`から`SellerStatusSidebar`に`todayCallWithInfoGroups`が正しく渡されているか
2. `SellerStatusSidebar.tsx`で`todayCallWithInfoGroups`が正しくレンダリングされているか
3. `group.label`が正しく表示されているか

**修正箇所**:
- `frontend/src/pages/CallModePage.tsx`
- `frontend/src/components/SellerStatusSidebar.tsx`

## 成功基準

### 定量的基準

1. **APIレスポンス**:
   - `todayCallWithInfo` ≥ 8（該当する売主がいる場合）
   - `todayCallWithInfoGroups.length` > 0（該当する売主がいる場合）
   - 各グループの`label`が空文字列でない

2. **表示**:
   - サイドバーに具体的な内容が表示される
   - 「（内容）」のみの表示が0件

### 定性的基準

1. **ユーザビリティ**:
   - ユーザーが一目で連絡方法を確認できる
   - 売主リストページと同じ表示形式

2. **保守性**:
   - ログ出力により診断可能
   - ステアリングドキュメントに従った実装

## リスクと対策

### リスク1: バックエンドの修正が他のページに影響

**対策**:
- 売主リストページで動作確認
- 他のサイドバーカテゴリの動作確認

### リスク2: フロントエンドの型定義エラー

**対策**:
- TypeScriptのコンパイルエラーを確認
- 重複定義がないか確認

### リスク3: ハードリロード後に問題が再発

**対策**:
- ハードリロード後の動作確認
- キャッシュクリア後の動作確認

## 次のステップ

1. ✅ 要件定義書を作成（このドキュメント）
2. ⏳ ユーザーがブラウザコンソールでAPIレスポンスを確認
3. ⏳ 結果に基づいて問題箇所を特定
4. ⏳ 設計書を作成
5. ⏳ 実装タスクリストを作成
6. ⏳ 実装
7. ⏳ テスト
8. ⏳ コミット＆プッシュ

## 参考資料

- `.kiro/steering/sidebar-api-response-validation.md` - サイドバーAPIレスポンス検証ルール
- `.kiro/steering/sidebar-status-definition.md` - サイドバーステータス定義
- `.kiro/steering/system-isolation-rule.md` - システム隔離ルール
- コミット `86a8a0d` - 売主サイドバー「当日TEL（内容）」を内容別にグループ化表示

---

**作成日**: 2026年2月3日  
**作成者**: Kiro AI  
**ステータス**: Draft（ユーザーのAPIレスポンス確認待ち）
