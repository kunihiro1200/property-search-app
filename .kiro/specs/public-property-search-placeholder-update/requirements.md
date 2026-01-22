# 物件公開サイト検索バープレースホルダー更新

## Overview
物件公開サイトの検索バーのプレースホルダーテキストを変更し、一般ユーザーに対してより明確な検索体験を提供する。

## Background
現在の検索バーには「物件番号（AA12345）または所在地で検索」というプレースホルダーが表示されているが、これは一般ユーザーにとって混乱を招く可能性がある。物件番号検索機能は内部ユーザー向けに維持しつつ、表示上は所在地検索のみを案内することで、ユーザー体験を改善する。

## User Stories

### US-1: 一般ユーザーとしての検索体験
**As a** 一般ユーザー  
**I want to** 検索バーに「所在地で検索」というシンプルなプレースホルダーを見る  
**So that** 何を入力すべきか明確に理解できる

**Acceptance Criteria:**
- 検索バーのプレースホルダーが「所在地で検索」と表示される
- 物件番号での検索機能は引き続き動作する（内部機能として維持）
- すべての公開物件ページで統一されたプレースホルダーが使用される

## Functional Requirements

### FR-1: プレースホルダーテキストの更新
**Priority:** High  
**Description:** UnifiedSearchBarコンポーネントのデフォルトプレースホルダーを変更する

**Details:**
- デフォルトプレースホルダー: `'所在地で検索'`
- 変更前: `'物件番号（AA12345）または所在地で検索'`
- カスタムプレースホルダーのサポートは維持

### FR-2: 既存機能の維持
**Priority:** High  
**Description:** 物件番号検索機能は引き続き動作する

**Details:**
- 物件番号（AA形式）の入力時は自動的に物件番号検索として処理
- 所在地テキストの入力時は所在地検索として処理
- 検索ロジックに変更なし

## Non-Functional Requirements

### NFR-1: 一貫性
すべての公開物件ページで統一されたプレースホルダーテキストを使用

### NFR-2: 後方互換性
既存のカスタムプレースホルダー指定機能は維持

## Technical Constraints
- React TypeScriptコンポーネント
- 既存のUnifiedSearchBarコンポーネントを使用
- 検索ロジックの変更なし

## Success Metrics
- ユーザーが検索バーの使用目的を明確に理解できる
- 物件番号検索機能が引き続き正常に動作する
- コードの変更が最小限である

## Out of Scope
- 検索機能の拡張
- 検索結果の表示方法の変更
- 新しい検索フィルターの追加

## Implementation Status
✅ **COMPLETED** - 2025-01-04

### Changes Made:
1. `frontend/src/components/UnifiedSearchBar.tsx`
   - デフォルトプレースホルダーを `'所在地で検索'` に変更

2. `frontend/src/pages/PublicPropertiesPage.tsx`
   - カスタムプレースホルダーを `"所在地で検索"` に更新

3. `frontend/src/components/PublicPropertyHero.tsx`
   - デフォルトプレースホルダーを使用（変更不要）

### Verification:
- ✅ すべての公開物件ページで新しいプレースホルダーが表示される
- ✅ 物件番号検索機能が引き続き動作する
- ✅ 所在地検索機能が正常に動作する
