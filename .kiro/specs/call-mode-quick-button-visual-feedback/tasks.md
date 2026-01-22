# Tasks Document

## Overview

通話モードページのクイックボタン（EmailテンプレートとSMSテンプレート）の視覚的フィードバックを強化するための実装タスクリストです。

## Task Breakdown

### Task 1: Email Template Button Visual Feedback Enhancement
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1 hour

#### Description
Emailテンプレート選択ボタンの視覚的フィードバックを強化します。

#### Acceptance Criteria
- [ ] `MenuItem`の背景色が状態に応じて変更される
  - `pending`状態: `#fff9c4` (黄色)
  - `persisted`状態: `#f5f5f5` (グレー)
- [ ] 無効化されたボタンのテキストに取り消し線が表示される
- [ ] 無効化されたボタンのテキスト色が`#9e9e9e`に変更される
- [ ] 無効化されたボタンのホバー効果が無効になる
- [ ] 無効化されたボタンのカーソルが`not-allowed`になる
- [ ] `opacity`スタイルが削除される（背景色で十分視覚的に区別できるため）

#### Implementation Details
`frontend/src/pages/CallModePage.tsx`の以下の箇所を修正：

```typescript
// 現在の実装（lines 2006-2024付近）
<MenuItem 
  key={template.id} 
  value={template.id}
  disabled={disabled}
  sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'flex-start',
    py: 1.5,
    whiteSpace: 'normal',
    opacity: disabled ? 0.5 : 1,  // ← 削除
    cursor: disabled ? 'not-allowed' : 'pointer',
    position: 'relative',
  }}
>
```

↓ 修正後

```typescript
<MenuItem 
  key={template.id} 
  value={template.id}
  disabled={disabled}
  aria-disabled={disabled}
  aria-label={`${template.label}${disabled ? ` - ${buttonState === 'pending' ? '保存待ち' : '使用済み'}` : ''}`}
  sx={{ 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'flex-start',
    py: 1.5,
    whiteSpace: 'normal',
    position: 'relative',
    
    // 背景色の変更（状態に応じて）
    backgroundColor: disabled 
      ? (buttonState === 'pending' ? '#fff9c4' : '#f5f5f5')
      : 'inherit',
    
    // テキストスタイルの変更
    textDecoration: disabled ? 'line-through' : 'none',
    color: disabled ? '#9e9e9e' : 'inherit',
    
    // ホバー時の動作制御
    cursor: disabled ? 'not-allowed' : 'pointer',
    '&:hover': {
      backgroundColor: disabled 
        ? (buttonState === 'pending' ? '#fff9c4' : '#f5f5f5')
        : undefined,
    },
  }}
>
```

#### Files to Modify
- `frontend/src/pages/CallModePage.tsx` (lines 2006-2024付近)

---

### Task 2: Email Template Badge Enhancement
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 30 minutes

#### Description
Emailテンプレートボタンのバッジ（保存待ち/使用済み）の視認性を向上させます。

#### Acceptance Criteria
- [ ] バッジのフォントサイズが`0.75rem`に変更される（現在: `0.65rem`）
- [ ] バッジの高さが`20px`に変更される（現在: `18px`）
- [ ] `pending`状態のバッジが黄色（warning color）で表示される
- [ ] `persisted`状態のバッジがグレー（default color）で表示される

#### Implementation Details
`frontend/src/pages/CallModePage.tsx`の以下の箇所を修正：

```typescript
// 現在の実装（lines 2027-2033付近）
<Chip 
  label={buttonState === 'pending' ? '保存待ち' : '使用済み'} 
  size="small" 
  color={buttonState === 'pending' ? 'warning' : 'default'}
  sx={{ ml: 1, fontSize: '0.65rem', height: '18px' }}
/>
```

↓ 修正後

```typescript
<Chip 
  label={buttonState === 'pending' ? '保存待ち' : '使用済み'} 
  size="small" 
  color={buttonState === 'pending' ? 'warning' : 'default'}
  sx={{ 
    ml: 1, 
    fontSize: '0.75rem',  // 0.65rem → 0.75rem
    height: '20px',       // 18px → 20px
  }}
/>
```

#### Files to Modify
- `frontend/src/pages/CallModePage.tsx` (lines 2027-2033付近)

---

### Task 3: SMS Template Button Visual Feedback Enhancement
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1 hour

#### Description
SMSテンプレート選択ボタンの視覚的フィードバックを強化します（Emailテンプレートと同じスタイルを適用）。

#### Acceptance Criteria
- [ ] `MenuItem`の背景色が状態に応じて変更される
  - `pending`状態: `#fff9c4` (黄色)
  - `persisted`状態: `#f5f5f5` (グレー)
- [ ] 無効化されたボタンのテキストに取り消し線が表示される
- [ ] 無効化されたボタンのテキスト色が`#9e9e9e`に変更される
- [ ] 無効化されたボタンのホバー効果が無効になる
- [ ] 無効化されたボタンのカーソルが`not-allowed`になる
- [ ] `opacity`スタイルが削除される
- [ ] Emailテンプレートと一貫したスタイルになる

#### Implementation Details
`frontend/src/pages/CallModePage.tsx`の以下の箇所を修正：

```typescript
// 現在の実装（lines 2063-2072付近）
<MenuItem 
  key={template.id} 
  value={template.id}
  disabled={disabled}
  sx={{
    opacity: disabled ? 0.5 : 1,  // ← 削除
    cursor: disabled ? 'not-allowed' : 'pointer',
  }}
>
```

↓ 修正後

```typescript
<MenuItem 
  key={template.id} 
  value={template.id}
  disabled={disabled}
  aria-disabled={disabled}
  aria-label={`${template.label}${disabled ? ` - ${buttonState === 'pending' ? '保存待ち' : '使用済み'}` : ''}`}
  sx={{
    // 背景色の変更（状態に応じて）
    backgroundColor: disabled 
      ? (buttonState === 'pending' ? '#fff9c4' : '#f5f5f5')
      : 'inherit',
    
    // テキストスタイルの変更
    textDecoration: disabled ? 'line-through' : 'none',
    color: disabled ? '#9e9e9e' : 'inherit',
    
    // ホバー時の動作制御
    cursor: disabled ? 'not-allowed' : 'pointer',
    '&:hover': {
      backgroundColor: disabled 
        ? (buttonState === 'pending' ? '#fff9c4' : '#f5f5f5')
        : undefined,
    },
  }}
>
```

#### Files to Modify
- `frontend/src/pages/CallModePage.tsx` (lines 2063-2072付近)

---

### Task 4: SMS Template Badge Enhancement
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 30 minutes

#### Description
SMSテンプレートボタンのバッジ（保存待ち/使用済み）の視認性を向上させます。

#### Acceptance Criteria
- [ ] バッジのフォントサイズが`0.75rem`に変更される（現在: `0.65rem`）
- [ ] バッジの高さが`20px`に変更される（現在: `18px`）
- [ ] `pending`状態のバッジが黄色（warning color）で表示される
- [ ] `persisted`状態のバッジがグレー（default color）で表示される
- [ ] Emailテンプレートのバッジと一貫したスタイルになる

#### Implementation Details
`frontend/src/pages/CallModePage.tsx`の以下の箇所を修正：

```typescript
// 現在の実装（lines 2076-2082付近）
<Chip 
  label={buttonState === 'pending' ? '保存待ち' : '使用済み'} 
  size="small" 
  color={buttonState === 'pending' ? 'warning' : 'default'}
  sx={{ ml: 1, fontSize: '0.65rem', height: '18px' }}
/>
```

↓ 修正後

```typescript
<Chip 
  label={buttonState === 'pending' ? '保存待ち' : '使用済み'} 
  size="small" 
  color={buttonState === 'pending' ? 'warning' : 'default'}
  sx={{ 
    ml: 1, 
    fontSize: '0.75rem',  // 0.65rem → 0.75rem
    height: '20px',       // 18px → 20px
  }}
/>
```

#### Files to Modify
- `frontend/src/pages/CallModePage.tsx` (lines 2076-2082付近)

---

### Task 5: Manual Testing
**Status:** Not Started  
**Priority:** High  
**Estimated Time:** 1 hour

#### Description
実装した視覚的フィードバックの動作を手動でテストします。

#### Test Cases

##### Email Template Button Tests
1. **Normal State Test**
   - [ ] ボタンが通常の色で表示される
   - [ ] ホバー時に背景色が変わる
   - [ ] カーソルが`pointer`になる
   - [ ] バッジが表示されない

2. **Pending State Test**
   - [ ] ボタンをクリックすると背景色が黄色（`#fff9c4`）になる
   - [ ] テキストに取り消し線が表示される
   - [ ] テキスト色がグレー（`#9e9e9e`）になる
   - [ ] 「保存待ち」バッジが黄色で表示される
   - [ ] ホバー時に背景色が変わらない
   - [ ] カーソルが`not-allowed`になる

3. **Persisted State Test**
   - [ ] 保存後、背景色がグレー（`#f5f5f5`）になる
   - [ ] テキストに取り消し線が表示される
   - [ ] テキスト色がグレー（`#9e9e9e`）になる
   - [ ] 「使用済み」バッジがグレーで表示される
   - [ ] ホバー時に背景色が変わらない
   - [ ] カーソルが`not-allowed`になる

4. **State Persistence Test**
   - [ ] ページをリロードしても`persisted`状態が保持される
   - [ ] 別の売主ページに移動して戻っても状態が保持される

##### SMS Template Button Tests
1. **Normal State Test**
   - [ ] ボタンが通常の色で表示される
   - [ ] ホバー時に背景色が変わる
   - [ ] カーソルが`pointer`になる
   - [ ] バッジが表示されない

2. **Pending State Test**
   - [ ] ボタンをクリックすると背景色が黄色（`#fff9c4`）になる
   - [ ] テキストに取り消し線が表示される
   - [ ] テキスト色がグレー（`#9e9e9e`）になる
   - [ ] 「保存待ち」バッジが黄色で表示される
   - [ ] ホバー時に背景色が変わらない
   - [ ] カーソルが`not-allowed`になる

3. **Persisted State Test**
   - [ ] 保存後、背景色がグレー（`#f5f5f5`）になる
   - [ ] テキストに取り消し線が表示される
   - [ ] テキスト色がグレー（`#9e9e9e`）になる
   - [ ] 「使用済み」バッジがグレーで表示される
   - [ ] ホバー時に背景色が変わらない
   - [ ] カーソルが`not-allowed`になる

4. **State Persistence Test**
   - [ ] ページをリロードしても`persisted`状態が保持される
   - [ ] 別の売主ページに移動して戻っても状態が保持される

##### Consistency Tests
1. **Email vs SMS Consistency**
   - [ ] EmailとSMSのボタンが同じ視覚スタイルを持つ
   - [ ] バッジのサイズと色が一致する
   - [ ] ホバー動作が一致する

2. **Multiple Button Test**
   - [ ] 複数のボタンを連続してクリックできる
   - [ ] 各ボタンが独立して状態を管理する
   - [ ] 保存時にすべての`pending`状態が`persisted`に変わる

#### Files to Test
- `frontend/src/pages/CallModePage.tsx`

---

### Task 6: Accessibility Testing
**Status:** Not Started  
**Priority:** Medium  
**Estimated Time:** 1 hour

#### Description
アクセシビリティ基準を満たしているかテストします。

#### Test Cases

1. **Screen Reader Test**
   - [ ] ボタンの状態がスクリーンリーダーで読み上げられる
   - [ ] `aria-disabled`属性が正しく設定されている
   - [ ] `aria-label`に状態情報が含まれている
   - [ ] バッジのテキストが読み上げられる

2. **Keyboard Navigation Test**
   - [ ] Tabキーでボタン間を移動できる
   - [ ] 無効化されたボタンもフォーカス可能
   - [ ] フォーカスインジケーターが表示される
   - [ ] Enterキーでボタンを選択できる（有効な場合）

3. **Color Contrast Test**
   - [ ] Pending背景（`#fff9c4`）+ グレーテキスト（`#9e9e9e`）: WCAG AA準拠
   - [ ] Persisted背景（`#f5f5f5`）+ グレーテキスト（`#9e9e9e`）: WCAG AA準拠
   - [ ] バッジのテキストコントラストが十分

4. **Visual Impairment Test**
   - [ ] 色覚異常シミュレーターで状態が区別できる
   - [ ] 取り消し線だけでも無効化が分かる
   - [ ] バッジテキストだけでも状態が分かる

#### Tools
- NVDA / JAWS (スクリーンリーダー)
- Chrome DevTools (Lighthouse)
- WebAIM Contrast Checker
- Color Oracle (色覚異常シミュレーター)

---

### Task 7: Cross-Browser Testing
**Status:** Not Started  
**Priority:** Medium  
**Estimated Time:** 30 minutes

#### Description
主要ブラウザで視覚的フィードバックが正しく表示されることを確認します。

#### Test Cases

1. **Chrome**
   - [ ] 背景色が正しく表示される
   - [ ] 取り消し線が表示される
   - [ ] ホバー効果が正しく動作する
   - [ ] カーソルが正しく変わる

2. **Firefox**
   - [ ] 背景色が正しく表示される
   - [ ] 取り消し線が表示される
   - [ ] ホバー効果が正しく動作する
   - [ ] カーソルが正しく変わる

3. **Safari**
   - [ ] 背景色が正しく表示される
   - [ ] 取り消し線が表示される
   - [ ] ホバー効果が正しく動作する
   - [ ] カーソルが正しく変わる

4. **Edge**
   - [ ] 背景色が正しく表示される
   - [ ] 取り消し線が表示される
   - [ ] ホバー効果が正しく動作する
   - [ ] カーソルが正しく変わる

#### Browsers to Test
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

---

### Task 8: Documentation Update
**Status:** Not Started  
**Priority:** Low  
**Estimated Time:** 30 minutes

#### Description
実装内容をドキュメントに記録します。

#### Deliverables
- [ ] IMPLEMENTATION_COMPLETE.mdを作成
  - 実装内容のサマリー
  - 変更されたファイルのリスト
  - スクリーンショット（Before/After）
  - 既知の問題点（あれば）
- [ ] USER_GUIDE.mdを作成（オプション）
  - ユーザー向けの使い方ガイド
  - 各状態の説明
  - トラブルシューティング

#### Files to Create
- `.kiro/specs/call-mode-quick-button-visual-feedback/IMPLEMENTATION_COMPLETE.md`
- `.kiro/specs/call-mode-quick-button-visual-feedback/USER_GUIDE.md` (オプション)

---

## Task Dependencies

```
Task 1 (Email Button) ──┐
                        ├──> Task 5 (Manual Testing)
Task 2 (Email Badge) ───┤
                        │
Task 3 (SMS Button) ────┤
                        │
Task 4 (SMS Badge) ─────┘
                        │
                        ├──> Task 6 (Accessibility Testing)
                        │
                        ├──> Task 7 (Cross-Browser Testing)
                        │
                        └──> Task 8 (Documentation)
```

## Estimated Total Time

| Task | Estimated Time |
|------|---------------|
| Task 1: Email Button Enhancement | 1 hour |
| Task 2: Email Badge Enhancement | 30 minutes |
| Task 3: SMS Button Enhancement | 1 hour |
| Task 4: SMS Badge Enhancement | 30 minutes |
| Task 5: Manual Testing | 1 hour |
| Task 6: Accessibility Testing | 1 hour |
| Task 7: Cross-Browser Testing | 30 minutes |
| Task 8: Documentation | 30 minutes |
| **Total** | **6 hours** |

## Implementation Order

1. **Phase 1: Email Templates** (Tasks 1-2)
   - Implement visual feedback for Email template buttons
   - Test Email buttons independently

2. **Phase 2: SMS Templates** (Tasks 3-4)
   - Apply same changes to SMS template buttons
   - Ensure consistency with Email buttons

3. **Phase 3: Testing & Documentation** (Tasks 5-8)
   - Comprehensive testing
   - Document implementation

## Success Criteria

- [ ] すべてのタスクが完了している
- [ ] すべてのテストケースがパスしている
- [ ] アクセシビリティ基準を満たしている
- [ ] クロスブラウザで正しく動作している
- [ ] ドキュメントが完成している
- [ ] ユーザーフィードバックが良好

## Notes

- 実装は段階的に行い、各フェーズでテストを実施する
- 問題が発見された場合は、すぐに修正する
- ユーザーフィードバックを収集し、必要に応じて調整する
