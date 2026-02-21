# 業務依頼リストのカラー統一 - タスクリスト

## タスク概要

業務依頼リスト関連の全画面で紫色（`#9c27b0`）のテーマカラーを統一的に適用する。

---

## タスク一覧

- [x] 1. WorkTasksPage.tsx のカラー統一
  - [x] 1.1 カラー定義のインポート追加
  - [x] 1.2 ページタイトルに紫色を適用
  - [x] 1.3 テーブルヘッダーに薄い紫色の背景を適用
  - [x] 1.4 物件番号リンクに紫色を適用
  - [x] 1.5 サイドバー選択状態に紫色を適用
  - [x] 1.6 バッジに紫色を適用

- [x] 2. WorkTaskDetailModal.tsx のカラー統一
  - [x] 2.1 カラー定義のインポート追加
  - [x] 2.2 タブの選択色を紫色に変更（赤色から変更）
  - [x] 2.3 タブインジケーターを紫色に変更
  - [x] 2.4 保存ボタンを紫色に変更
  - [x] 2.5 EditableButtonSelect の選択ボタンを紫色に変更
  - [x] 2.6 EditableYesNo の選択ボタンを紫色に変更

- [x] 3. WorkTaskSection.tsx のカラー統一
  - [x] 3.1 カラー定義のインポート追加
  - [x] 3.2 セクションタイトルに紫色を適用
  - [x] 3.3 カテゴリヘッダーに薄い紫色の背景を適用
  - [x] 3.4 ホバー時の背景色を紫色ベースに変更

- [ ] 4. テストと検証
  - [ ] 4.1 業務依頼一覧ページの表示確認
  - [ ] 4.2 業務詳細モーダルの表示確認
  - [ ] 4.3 業務依頼セクションの表示確認
  - [ ] 4.4 他のセクション（売主・買主・物件）への影響確認
  - [ ] 4.5 警告色・エラー色・成功色の維持確認

---

## タスク詳細

### 1. WorkTasksPage.tsx のカラー統一

#### 1.1 カラー定義のインポート追加
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更内容**:
```typescript
// ファイル冒頭に追加
import { SECTION_COLORS } from '../theme/sectionColors';

// コンポーネント内で定義
export default function WorkTasksPage() {
  const workTaskColor = SECTION_COLORS.workTask;
  // ...
}
```

---

#### 1.2 ページタイトルに紫色を適用
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更箇所**: 128行目付近
```typescript
// 変更前
<Typography variant="h5" fontWeight="bold" sx={{ mb: 2 }}>業務依頼</Typography>

// 変更後
<Typography 
  variant="h5" 
  fontWeight="bold" 
  sx={{ mb: 2, color: workTaskColor.main }}
>
  業務依頼
</Typography>
```

---

#### 1.3 テーブルヘッダーに薄い紫色の背景を適用
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更箇所**: 237行目付近
```typescript
// 変更前
<TableRow sx={{ bgcolor: '#f5f5f5' }}>

// 変更後
<TableRow sx={{ bgcolor: `${workTaskColor.light}20` }}>
```

---

#### 1.4 物件番号リンクに紫色を適用
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更箇所**: 262行目付近
```typescript
// 変更前
<Typography variant="body2" color="primary" fontWeight="bold">
  {task.property_number || '-'}
</Typography>

// 変更後
<Typography 
  variant="body2" 
  fontWeight="bold"
  sx={{ color: workTaskColor.main }}
>
  {task.property_number || '-'}
</Typography>
```

---

#### 1.5 サイドバー選択状態に紫色を適用
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更箇所**: 147行目付近
```typescript
// 変更前
sx={{ 
  py: 0.5,
  '&.Mui-selected': { bgcolor: 'action.selected' }
}}

// 変更後
sx={{ 
  py: 0.5,
  '&.Mui-selected': { 
    bgcolor: `${workTaskColor.light}30`,
    color: workTaskColor.dark,
    '& .MuiListItemText-primary': {
      fontWeight: 600,
    }
  }
}}
```

---

#### 1.6 バッジに紫色を適用
**ファイル**: `frontend/src/pages/WorkTasksPage.tsx`

**変更箇所**: 162行目付近
```typescript
// 変更前
<Badge
  badgeContent={cat.count}
  color="primary"
  max={999}
  sx={{ ml: 1 }}
/>

// 変更後
<Badge
  badgeContent={cat.count}
  max={999}
  sx={{ 
    ml: 1,
    '& .MuiBadge-badge': {
      bgcolor: workTaskColor.main,
      color: workTaskColor.contrastText,
    }
  }}
/>
```

---

### 2. WorkTaskDetailModal.tsx のカラー統一

#### 2.1 カラー定義のインポート追加
**ファイル**: `frontend/src/components/WorkTaskDetailModal.tsx`

**変更内容**:
```typescript
// ファイル冒頭に追加
import { SECTION_COLORS } from '../theme/sectionColors';

// コンポーネント内で定義
export default function WorkTaskDetailModal({ open, onClose, propertyNumber, onUpdate }: WorkTaskDetailModalProps) {
  const workTaskColor = SECTION_COLORS.workTask;
  // ...
}
```

---

#### 2.2 タブの選択色を紫色に変更（赤色から変更）
**ファイル**: `frontend/src/components/WorkTaskDetailModal.tsx`

**変更箇所**: 449行目付近
```typescript
// 変更前
sx={{
  '& .MuiTab-root': { minWidth: 'auto', px: 2 },
  '& .Mui-selected': { color: 'error.main' },
  '& .MuiTabs-indicator': { backgroundColor: 'error.main' },
}}

// 変更後
sx={{
  '& .MuiTab-root': { minWidth: 'auto', px: 2 },
  '& .Mui-selected': { color: workTaskColor.main },
  '& .MuiTabs-indicator': { backgroundColor: workTaskColor.main },
}}
```

---

#### 2.3 タブインジケーターを紫色に変更
**説明**: 2.2 で同時に変更済み

---

#### 2.4 保存ボタンを紫色に変更
**ファイル**: `frontend/src/components/WorkTaskDetailModal.tsx`

**変更箇所**: 476行目付近
```typescript
// 変更前
<Button
  onClick={handleSave}
  variant="contained"
  color="primary"
  disabled={!hasChanges || saving}
  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
>
  {saving ? '保存中...' : '保存'}
</Button>

// 変更後
<Button
  onClick={handleSave}
  variant="contained"
  disabled={!hasChanges || saving}
  startIcon={saving ? <CircularProgress size={16} /> : <SaveIcon />}
  sx={{
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    },
    '&:disabled': {
      bgcolor: 'action.disabledBackground',
      color: 'action.disabled',
    }
  }}
>
  {saving ? '保存中...' : '保存'}
</Button>
```

---

#### 2.5 EditableButtonSelect の選択ボタンを紫色に変更
**ファイル**: `frontend/src/components/WorkTaskDetailModal.tsx`

**変更箇所**: 234行目付近（EditableButtonSelect コンポーネント内）
```typescript
// 変更前
<Button
  key={opt}
  variant={getValue(field) === opt ? 'contained' : 'outlined'}
  color={getValue(field) === opt ? 'primary' : 'inherit'}
  onClick={() => handleFieldChange(field, opt)}
>
  {opt}
</Button>

// 変更後
<Button
  key={opt}
  variant={getValue(field) === opt ? 'contained' : 'outlined'}
  onClick={() => handleFieldChange(field, opt)}
  sx={getValue(field) === opt ? {
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    }
  } : {
    borderColor: 'divider',
    color: 'text.secondary',
  }}
>
  {opt}
</Button>
```

---

#### 2.6 EditableYesNo の選択ボタンを紫色に変更
**ファイル**: `frontend/src/components/WorkTaskDetailModal.tsx`

**変更箇所**: 252行目付近（EditableYesNo コンポーネント内）
```typescript
// 変更前（Yボタン）
<Button
  variant={getValue(field) === 'Y' ? 'contained' : 'outlined'}
  color={getValue(field) === 'Y' ? 'primary' : 'inherit'}
  onClick={() => handleFieldChange(field, 'Y')}
>Y</Button>

// 変更後（Yボタン）
<Button
  variant={getValue(field) === 'Y' ? 'contained' : 'outlined'}
  onClick={() => handleFieldChange(field, 'Y')}
  sx={getValue(field) === 'Y' ? {
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    }
  } : {
    borderColor: 'divider',
    color: 'text.secondary',
  }}
>Y</Button>

// Nボタンも同様に変更（color="inherit" を sx に変更）
<Button
  variant={getValue(field) === 'N' ? 'contained' : 'outlined'}
  onClick={() => handleFieldChange(field, 'N')}
  sx={getValue(field) === 'N' ? {
    bgcolor: workTaskColor.main,
    color: workTaskColor.contrastText,
    '&:hover': {
      bgcolor: workTaskColor.dark,
    }
  } : {
    borderColor: 'divider',
    color: 'text.secondary',
  }}
>N</Button>
```

---

### 3. WorkTaskSection.tsx のカラー統一

#### 3.1 カラー定義のインポート追加
**ファイル**: `frontend/src/components/WorkTaskSection.tsx`

**変更内容**:
```typescript
// ファイル冒頭に追加
import { SECTION_COLORS } from '../theme/sectionColors';

// コンポーネント内で定義
const WorkTaskSection: React.FC<WorkTaskSectionProps> = ({ sellerNumber }) => {
  const workTaskColor = SECTION_COLORS.workTask;
  // ...
}
```

---

#### 3.2 セクションタイトルに紫色を適用
**ファイル**: `frontend/src/components/WorkTaskSection.tsx`

**変更箇所**: 147行目付近
```typescript
// 変更前
<h3 className="text-lg font-semibold mb-4">業務依頼</h3>

// 変更後
<h3 
  className="text-lg font-semibold mb-4"
  style={{ color: workTaskColor.main }}
>
  業務依頼
</h3>
```

---

#### 3.3 カテゴリヘッダーに薄い紫色の背景を適用
**ファイル**: `frontend/src/components/WorkTaskSection.tsx`

**変更箇所**: 153行目付近
```typescript
// 変更前
<button
  onClick={() => toggleCategory(category)}
  className="w-full px-4 py-2 text-left font-medium bg-gray-50 hover:bg-gray-100 flex justify-between items-center"
>

// 変更後
<button
  onClick={() => toggleCategory(category)}
  className="w-full px-4 py-2 text-left font-medium flex justify-between items-center"
  style={{
    backgroundColor: `${workTaskColor.light}20`,
  }}
>
```

---

#### 3.4 ホバー時の背景色を紫色ベースに変更
**ファイル**: `frontend/src/components/WorkTaskSection.tsx`

**変更箇所**: 153行目付近（3.3 と同じボタン要素）
```typescript
// 変更後（3.3 に追加）
<button
  onClick={() => toggleCategory(category)}
  className="w-full px-4 py-2 text-left font-medium flex justify-between items-center"
  style={{
    backgroundColor: `${workTaskColor.light}20`,
    transition: 'background-color 0.2s',
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.backgroundColor = `${workTaskColor.light}30`;
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.backgroundColor = `${workTaskColor.light}20`;
  }}
>
```

---

### 4. テストと検証

#### 4.1 業務依頼一覧ページの表示確認
**手順**:
1. ブラウザで `/work-tasks` にアクセス
2. 以下を確認:
   - [ ] ページタイトル「業務依頼」が紫色
   - [ ] テーブルヘッダーが薄い紫色の背景
   - [ ] 物件番号が紫色のリンク
   - [ ] サイドバーの選択状態が紫色
   - [ ] バッジが紫色

---

#### 4.2 業務詳細モーダルの表示確認
**手順**:
1. 業務依頼一覧ページで任意の行をクリック
2. モーダルが開いたら以下を確認:
   - [ ] タブの選択色が紫色（赤色でないこと）
   - [ ] タブのインジケーターが紫色
   - [ ] 保存ボタンが紫色
   - [ ] 営業担当などの選択ボタンが紫色
   - [ ] Yes/No ボタンの選択時が紫色

---

#### 4.3 業務依頼セクションの表示確認
**手順**:
1. 売主詳細ページにアクセス（業務依頼データがある売主）
2. 業務依頼セクションで以下を確認:
   - [ ] セクションタイトル「業務依頼」が紫色
   - [ ] カテゴリヘッダーが薄い紫色の背景
   - [ ] ホバー時に背景色が濃い紫色に変わる

---

#### 4.4 他のセクション（売主・買主・物件）への影響確認
**手順**:
1. 売主リストページ（`/sellers`）にアクセス
   - [ ] オレンジ色が維持されている
2. 買主リストページ（`/buyers`）にアクセス
   - [ ] 緑色が維持されている
3. 物件リストページ（`/property-listings`）にアクセス
   - [ ] 青色が維持されている

---

#### 4.5 警告色・エラー色・成功色の維持確認
**手順**:
1. 業務依頼一覧ページで以下を確認:
   - [ ] ステータスチップの警告色（「未」「要」）が黄色/オレンジ色
   - [ ] エラーメッセージが赤色
   - [ ] 成功メッセージが緑色

---

## 完了条件

- [ ] 全てのタスク（1.1〜4.5）が完了している
- [ ] 業務依頼関連の全画面で紫色のテーマカラーが統一されている
- [ ] 他のセクション（売主・買主・物件）のカラーに影響がない
- [ ] 警告色・エラー色・成功色が維持されている
- [ ] ビルドエラーがない
- [ ] コンソールエラーがない

---

## 注意事項

### システム隔離ルール
- 業務依頼リスト（Work Task Management）のみを変更する
- 売主リスト、買主リスト、物件リスト、物件公開サイトには影響を与えない

### 後方互換性
- URLの変更はない
- APIエンドポイントの変更はない
- データ構造の変更はない

### ファイルエンコーディング
- UTF-8 with BOM を維持する
- 日本語コメントが文字化けしないように注意
