# Design Document

## Introduction

通話モードページのクイックボタン（EmailテンプレートとSMSテンプレート）の視覚的フィードバックを強化し、ユーザーがボタンの無効化状態を明確に認識できるようにします。現在の実装では`opacity: 0.5`のみが適用されており、元のボタン色がグレー系のため視覚的な変化が分かりにくい問題があります。

## System Architecture

### Current Implementation

```
CallModePage.tsx
├── useCallModeQuickButtonState hook
│   ├── handleQuickButtonClick() - ボタンクリック時に'pending'状態に設定
│   ├── handleSave() - 'pending'を'persisted'に変換してlocalStorageに保存
│   ├── isButtonDisabled() - ボタンが無効化されているかチェック
│   └── getButtonState() - 'pending' | 'persisted' | null を返す
│
├── Email Template Select (MenuItem)
│   ├── disabled={isButtonDisabled(buttonId)}
│   ├── sx={{ opacity: disabled ? 0.5 : 1 }} ← 現在の視覚フィードバック
│   └── Chip (保存待ち/使用済み)
│
└── SMS Template Select (MenuItem)
    ├── disabled={isButtonDisabled(buttonId)}
    ├── sx={{ opacity: disabled ? 0.5 : 1 }} ← 現在の視覚フィードバック
    └── Chip (保存待ち/使用済み)
```

### Proposed Changes

Material-UIの`MenuItem`コンポーネントの`sx`プロパティを拡張し、以下の視覚的フィードバックを追加します：

1. **背景色の変更**
   - `pending`状態: 黄色系 (`#fff9c4`)
   - `persisted`状態: グレー系 (`#f5f5f5`)

2. **テキストスタイルの変更**
   - 取り消し線: `textDecoration: 'line-through'`
   - テキスト色: `color: '#9e9e9e'`

3. **ホバー動作の制御**
   - 無効化時: `'&:hover': { backgroundColor: 'inherit' }`
   - カーソル: `cursor: 'not-allowed'`

4. **バッジの視認性向上**
   - フォントサイズ: `0.75rem` (現在: `0.65rem`)
   - 高さ: `20px` (現在: `18px`)

5. **アクセシビリティ属性**
   - `aria-disabled="true"`
   - `aria-label` に状態情報を含める

## Component Design

### Enhanced MenuItem Styling

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
        : undefined, // Material-UIのデフォルトホバー効果を使用
    },
    
    // 無効化時のopacityは削除（背景色で十分視覚的に区別できるため）
    // opacity: disabled ? 0.5 : 1, ← 削除
  }}
>
  {/* MenuItem content */}
</MenuItem>
```

### Enhanced Chip Styling

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

## Data Flow

### Button Click Flow

```
1. User clicks Email/SMS template button
   ↓
2. handleEmailTemplateSelect() / handleSmsTemplateSelect()
   ↓
3. handleQuickButtonClick(buttonId)
   ↓
4. disabledButtons.set(buttonId, 'pending')
   ↓
5. Component re-renders with:
   - Yellow background (#fff9c4)
   - Line-through text
   - Gray text color (#9e9e9e)
   - "保存待ち" badge (warning color)
   - No hover effect
   - Cursor: not-allowed
```

### Save Flow

```
1. User clicks "保存して終了" or "保存"
   ↓
2. handleSave() / handleSaveAndExit()
   ↓
3. handleQuickButtonSave()
   ↓
4. Convert all 'pending' → 'persisted'
   ↓
5. Save to localStorage
   ↓
6. Component re-renders with:
   - Gray background (#f5f5f5)
   - Line-through text
   - Gray text color (#9e9e9e)
   - "使用済み" badge (default color)
   - No hover effect
   - Cursor: not-allowed
```

## UI/UX Design

### Visual States Comparison

| State | Background | Text Color | Text Decoration | Badge | Hover | Cursor |
|-------|-----------|-----------|----------------|-------|-------|--------|
| **Normal** | inherit | inherit | none | - | ✓ | pointer |
| **Pending** | #fff9c4 (yellow) | #9e9e9e (gray) | line-through | 保存待ち (warning) | ✗ | not-allowed |
| **Persisted** | #f5f5f5 (gray) | #9e9e9e (gray) | line-through | 使用済み (default) | ✗ | not-allowed |

### Color Palette

```css
/* Pending State */
--pending-bg: #fff9c4;        /* Light yellow */
--pending-badge: warning;      /* Material-UI warning color */

/* Persisted State */
--persisted-bg: #f5f5f5;      /* Light gray */
--persisted-badge: default;    /* Material-UI default color */

/* Disabled Text */
--disabled-text: #9e9e9e;     /* Medium gray */
```

### Accessibility Considerations

1. **Color Contrast**
   - Pending background (#fff9c4) + gray text (#9e9e9e): WCAG AA compliant
   - Persisted background (#f5f5f5) + gray text (#9e9e9e): WCAG AA compliant

2. **Screen Reader Support**
   - `aria-disabled="true"` for disabled buttons
   - `aria-label` includes state information
   - Badge text is readable by screen readers

3. **Keyboard Navigation**
   - Disabled buttons are still focusable (Material-UI default)
   - Visual feedback is clear even without color perception

## Implementation Strategy

### Phase 1: Email Template Buttons
1. Update `MenuItem` sx styling for Email templates
2. Update `Chip` styling for Email templates
3. Add `aria-disabled` and `aria-label` attributes
4. Test visual feedback and accessibility

### Phase 2: SMS Template Buttons
1. Apply same styling changes to SMS templates
2. Ensure consistency with Email templates
3. Test visual feedback and accessibility

### Phase 3: Testing & Refinement
1. Manual testing of all visual states
2. Accessibility testing with screen readers
3. Cross-browser testing
4. User feedback collection

## Technical Considerations

### Performance
- No performance impact expected
- CSS changes only, no additional JavaScript logic
- No additional API calls or state management

### Browser Compatibility
- Material-UI components are cross-browser compatible
- CSS properties used are widely supported
- No vendor prefixes needed

### Maintenance
- Styling is centralized in `CallModePage.tsx`
- Easy to update colors or styles in the future
- No external dependencies added

## Testing Strategy

### Manual Testing Checklist
- [ ] Email template button: Normal state
- [ ] Email template button: Pending state (after click)
- [ ] Email template button: Persisted state (after save)
- [ ] SMS template button: Normal state
- [ ] SMS template button: Pending state (after click)
- [ ] SMS template button: Persisted state (after save)
- [ ] Hover behavior on normal buttons
- [ ] Hover behavior on disabled buttons
- [ ] Badge visibility and colors
- [ ] Text readability in all states
- [ ] Cursor changes appropriately

### Accessibility Testing
- [ ] Screen reader announces button state
- [ ] Keyboard navigation works correctly
- [ ] Color contrast meets WCAG AA standards
- [ ] Focus indicators are visible

### Cross-Browser Testing
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Success Metrics

### User Experience
- Users can clearly identify disabled buttons
- Users understand the difference between pending and persisted states
- No confusion about button availability

### Accessibility
- All WCAG AA standards met
- Screen reader users can understand button states
- Keyboard navigation is smooth

### Visual Design
- Consistent styling across Email and SMS templates
- Clear visual hierarchy
- Professional appearance

## Future Enhancements

### Potential Improvements
1. **Animation**: Add subtle fade transition when state changes
2. **Tooltip**: Show detailed state information on hover
3. **Undo**: Allow users to undo pending state before save
4. **Bulk Actions**: Clear all pending states at once
5. **State History**: Show when button was last used

### Scalability
- Design can be easily extended to other button types
- Color scheme can be customized via theme
- State management can be enhanced with additional states if needed

## Conclusion

この設計により、通話モードページのクイックボタンの視覚的フィードバックが大幅に改善されます。ユーザーはボタンの状態を一目で理解でき、誤操作を防ぐことができます。また、アクセシビリティ基準を満たし、すべてのユーザーが快適に使用できるインターフェースを提供します。
